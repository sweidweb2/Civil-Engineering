import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { logPerf } from '../../logging/perf.js'
import type { ProjectProductivityHourEntry } from './project-productivity.types.js'

/** Soft cap so a single project cannot return an unbounded series. */
const MAX_SERIES = 730

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Parse `YYYY-MM-DD` as a UTC midnight Date for `@db.Date` columns. */
function parseWorkDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function mapRow(row: {
  id: string
  projectId: string
  workDate: Date
  hours: { toString(): string }
  createdAt: Date
  updatedAt: Date
}): ProjectProductivityHourEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    date: toDateOnly(row.workDate),
    hours: row.hours.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type ProjectProductivityRepository = {
  listByProjectId: (projectId: string) => Promise<ProjectProductivityHourEntry[]>
  upsert: (
    projectId: string,
    workDate: string,
    hours: string,
  ) => Promise<ProjectProductivityHourEntry>
}

export function createProjectProductivityRepository(): ProjectProductivityRepository {
  return {
    async listByProjectId(projectId) {
      const started = performance.now()
      const rows = await prisma.projectProductivityHour.findMany({
        where: { projectId },
        orderBy: { workDate: 'asc' },
        take: MAX_SERIES,
      })
      const ms = Math.round(performance.now() - started)
      logPerf('productivity', `listByProjectId ${ms}ms`, { projectId, ms, queries: 1 })
      return rows.map(mapRow)
    },

    async upsert(projectId, workDate, hours) {
      const day = parseWorkDate(workDate)
      return translateUniqueConflict(async () => {
        const row = await prisma.projectProductivityHour.upsert({
          where: {
            projectId_workDate: { projectId, workDate: day },
          },
          create: { projectId, workDate: day, hours },
          update: { hours },
        })
        return mapRow(row)
      })
    },
  }
}
