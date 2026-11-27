import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { conflict, isUniqueConflictError } from '../../errors/app-error.js'
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
  /**
   * `expectedUpdatedAt`: omitted = last write wins; `null` = create only (409 if the
   * day already has a value); a timestamp = update only if the row is unchanged.
   */
  upsert: (
    projectId: string,
    workDate: string,
    hours: string,
    expectedUpdatedAt?: string | null,
  ) => Promise<ProjectProductivityHourEntry>
}

export function createProjectProductivityRepository(): ProjectProductivityRepository {
  return {
    async listByProjectId(projectId) {
      const started = performance.now()
      // Newest first so the cap drops the oldest days (not today), then chronological.
      const rows = (
        await prisma.projectProductivityHour.findMany({
          where: { projectId },
          orderBy: { workDate: 'desc' },
          take: MAX_SERIES,
        })
      ).reverse()
      const ms = Math.round(performance.now() - started)
      logPerf('productivity', `listByProjectId ${ms}ms`, { projectId, ms, queries: 1 })
      return rows.map(mapRow)
    },

    async upsert(projectId, workDate, hours, expectedUpdatedAt) {
      const day = parseWorkDate(workDate)
      const key = { projectId_workDate: { projectId, workDate: day } }
      const versionConflict = () =>
        conflict(
          'Hours for this day were changed elsewhere; reload and try again',
          'PRODUCTIVITY_VERSION_CONFLICT',
        )

      if (expectedUpdatedAt === null) {
        try {
          return mapRow(
            await translateUniqueConflict(() =>
              prisma.projectProductivityHour.create({
                data: { projectId, workDate: day, hours },
              }),
            ),
          )
        } catch (error) {
          if (isUniqueConflictError(error)) throw versionConflict()
          throw error
        }
      }

      if (expectedUpdatedAt !== undefined) {
        const expected = new Date(expectedUpdatedAt)
        const cas = await prisma.projectProductivityHour.updateMany({
          where: { projectId, workDate: day, updatedAt: expected },
          data: { hours },
        })
        if (cas.count !== 1) throw versionConflict()
        return mapRow(await prisma.projectProductivityHour.findUniqueOrThrow({ where: key }))
      }

      // Last write wins. Two first writes for the same day can race inside the
      // upsert (both try INSERT): the loser retries once and lands as an update.
      const run = () =>
        translateUniqueConflict(() =>
          prisma.projectProductivityHour.upsert({
            where: key,
            create: { projectId, workDate: day, hours },
            update: { hours },
          }),
        )
      try {
        return mapRow(await run())
      } catch (error) {
        if (!isUniqueConflictError(error)) throw error
        return mapRow(await run())
      }
    },
  }
}
