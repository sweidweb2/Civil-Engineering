import { loadOverview } from '@/features/pm/pmOverview'
import { ApiError } from '@/services/api'
import { getProjectsOverview, getProjectStagesSummaries } from '@/services/project-stages'
import { listProjects } from '@/services/projects'

jest.mock('@/services/project-stages', () => ({
  getProjectsOverview: jest.fn(),
  getProjectStagesSummaries: jest.fn(),
}))
jest.mock('@/services/projects', () => ({ listProjects: jest.fn() }))

const overview = jest.mocked(getProjectsOverview)
const summaries = jest.mocked(getProjectStagesSummaries)
const list = jest.mocked(listProjects)

const project = (id: string, status = 'IN_PROGRESS') => ({ id, status }) as never
const stages = { geotechnical: { exists: true } } as never
const summary = { total: 2 } as never
const page = (data: never[], withSummary: unknown = null) =>
  ({ data, meta: { total: data.length, page: 1, limit: 20 }, summary: withSummary }) as never

describe('loadOverview (PM home)', () => {
  beforeEach(() => jest.resetAllMocks())

  it('loads everything in one request', async () => {
    overview.mockResolvedValue({
      ...(page([project('p1'), project('p2', 'COMPLETED')], summary) as object),
      stages: { p1: stages },
    } as never)

    const result = await loadOverview()

    expect(result.summary).toBe(summary)
    expect(result.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
    // Only active statuses go in the carousel.
    expect(result.active).toEqual([{ project: project('p1'), stages }])
    expect(list).not.toHaveBeenCalled()
    expect(summaries).not.toHaveBeenCalled()
  })

  it('falls back to the two-request path on an older API (404)', async () => {
    overview.mockRejectedValue(new ApiError(404, 'Not found'))
    list.mockResolvedValue(page([project('p1')], summary))
    summaries.mockResolvedValue({ data: { p1: stages } } as never)

    const result = await loadOverview()

    expect(summaries).toHaveBeenCalledWith(['p1'])
    expect(result.summary).toBe(summary)
    expect(result.active[0]?.stages).toBe(stages)
  })

  it('on a server error, still renders the list without the summary', async () => {
    overview.mockRejectedValue(new ApiError(500, 'Internal'))
    list
      .mockRejectedValueOnce(new ApiError(500, 'Internal')) // list + summary
      .mockResolvedValueOnce(page([project('p1')])) // list alone
    summaries.mockRejectedValue(new TypeError('Network request failed'))

    const result = await loadOverview()

    expect(result.summary).toBeNull()
    expect(result.projects.map((p) => p.id)).toEqual(['p1'])
    expect(result.active).toEqual([{ project: project('p1'), stages: null }])
  })

  it.each([
    ['offline', new TypeError('Network request failed')],
    ['gateway down', new ApiError(503, 'Unavailable')],
    ['forbidden', new ApiError(403, 'Forbidden')],
  ])('fails straight away when %s (no extra requests)', async (_label, error) => {
    overview.mockRejectedValue(error)
    await expect(loadOverview()).rejects.toBe(error)
    expect(list).not.toHaveBeenCalled()
  })
})
