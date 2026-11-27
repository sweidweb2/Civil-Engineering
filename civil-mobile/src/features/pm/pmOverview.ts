import { isServerUnreachable } from '@/lib/serverReachability'
import type { ApiError } from '@/services/api'
import {
  getProjectsOverview,
  getProjectStagesSummaries,
  type ProjectStagesSummary,
} from '@/services/project-stages'
import {
  listProjects,
  type Project,
  type ProjectStatus,
  type ProjectSummary,
} from '@/services/projects'

/** PM home data: status summary, recent projects, and the active-project carousel. */

const CAROUSEL_STATUSES: ProjectStatus[] = ['IN_PROGRESS', 'APPROVED', 'PLANNING']

export type Overview = {
  summary: ProjectSummary | null
  projects: Project[]
  /** Carousel projects with their stage summaries (null when that call failed). */
  active: { project: Project; stages: ProjectStagesSummary | null }[]
}

const PAGE = 20

function toOverview(
  projects: Project[],
  summary: ProjectSummary | null,
  stageMap: Record<string, ProjectStagesSummary>,
): Overview {
  const carousel = projects.filter((p) => CAROUSEL_STATUSES.includes(p.status)).slice(0, 5)
  return {
    summary,
    projects,
    active: carousel.map((project) => ({ project, stages: stageMap[project.id] ?? null })),
  }
}

/** True for a real server answer worth a second try: 404 (older API) or a non-gateway 5xx. */
const worthFallback = (error: unknown) =>
  !isServerUnreachable(error) &&
  ((error as ApiError).status === 404 || (error as ApiError).status >= 500)

/**
 * Two-request path for an API without `/projects/stages/overview` (or when it fails on
 * the server): list (+ summary, or alone if that fails), then carousel stage summaries,
 * which soft-fail so the rest of the dashboard still renders.
 */
async function loadOverviewInSteps(): Promise<Overview> {
  let projects: Project[]
  let summary: ProjectSummary | null = null
  try {
    const list = await listProjects({ page: 1, limit: PAGE, includeSummary: true })
    projects = list.data
    summary = list.summary
  } catch (error) {
    if (!worthFallback(error)) throw error
    projects = (await listProjects({ page: 1, limit: PAGE })).data
  }
  const carouselIds = toOverview(projects, null, {}).active.map(({ project }) => project.id)
  const stageMap =
    carouselIds.length === 0
      ? {}
      : await getProjectStagesSummaries(carouselIds)
          .then((r) => r.data)
          .catch(() => ({}) as Record<string, ProjectStagesSummary>)
  return toOverview(projects, summary, stageMap)
}

/**
 * PM home in one request: projects + status summary + stage summaries. Offline /
 * timeout / gateway errors fail straight away (the saved offline copy takes over).
 */
export async function loadOverview(): Promise<Overview> {
  try {
    const overview = await getProjectsOverview(PAGE)
    return toOverview(overview.data, overview.summary, overview.stages)
  } catch (error) {
    if (!worthFallback(error)) throw error
    return loadOverviewInSteps()
  }
}
