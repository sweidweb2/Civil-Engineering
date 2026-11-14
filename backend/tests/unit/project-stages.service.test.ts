import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type { ProjectStagesRepository } from '../../src/modules/project-stages/project-stages.repository.js'
import { createProjectStagesService } from '../../src/modules/project-stages/project-stages.service.js'
import type {
  GeotechnicalStudy,
  ProjectStagesSummary,
} from '../../src/modules/project-stages/project-stages.types.js'
import type { ProjectsService } from '../../src/modules/projects/projects.service.js'
import type { Project } from '../../src/modules/projects/projects.types.js'

const project: Project = {
  id: 'p1',
  name: 'Site A',
  description: null,
  code: null,
  ownerId: 'owner-1',
  address: null,
  city: null,
  country: null,
  startDate: null,
  endDate: null,
  actualStartDate: null,
  actualEndDate: null,
  status: 'IN_PROGRESS',
  progress: 0,
  budget: null,
  currency: 'USD',
  actualCost: null,
  type: null,
  isPublic: false,
  tags: null,
  attachments: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
}

const geo: GeotechnicalStudy = {
  id: 'g1',
  projectId: 'p1',
  soilType: 'Clay',
  soilBearingCapacity: '100',
  groundwaterLevel: null,
  foundationRecommendation: 'Raft',
  reportFilePath: 'path/report.pdf',
  consultantName: 'Dr',
  status: 'IN_PROGRESS',
  startDate: '2026-01-01T00:00:00.000Z',
  completionDate: '2026-02-01T00:00:00.000Z',
  notes: 'Notes',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createHarness() {
  const assertAccessible = vi.fn(async (id: string) => {
    if (id !== 'p1') throw new AppError('NOT_FOUND', 'Project not found', 404)
    return project
  })

  const projectsService = {
    assertAccessible,
  } as unknown as ProjectsService

  const repository: ProjectStagesRepository = {
    findAllByProjectId: vi.fn(async () => ({
      geotechnical: null,
      design: null,
      licensing: null,
      materials: null,
      maintenance: null,
    })),
    findGeotechnical: vi.fn(async () => null),
    upsertGeotechnical: vi.fn(async (_projectId, input) => ({
      ...geo,
      ...input,
      groundwaterLevel: input.groundwaterLevel ?? null,
    })),
    findDesign: vi.fn(async () => null),
    upsertDesign: vi.fn(),
    findLicensing: vi.fn(async () => null),
    upsertLicensing: vi.fn(),
    findMaterials: vi.fn(async () => null),
    upsertMaterials: vi.fn(),
    findMaintenance: vi.fn(async () => null),
    upsertMaintenance: vi.fn(),
  }

  const service = createProjectStagesService({ repository, projectsService })
  return { service, repository, assertAccessible }
}

describe('projectStagesService', () => {
  it('returns incomplete summary slots when no rows exist', async () => {
    const { service } = createHarness()
    const summary: ProjectStagesSummary = await service.getSummary('p1', {
      id: 'owner-1',
      roles: ['MANAGER'],
    })
    expect(summary.geotechnical).toEqual({ exists: false, isComplete: false, data: null })
    expect(summary.design.exists).toBe(false)
    expect(summary.licensing.isComplete).toBe(false)
    expect(summary.materials.exists).toBe(false)
    expect(summary.maintenance.exists).toBe(false)
  })

  it('checks project access before upsert', async () => {
    const { service, assertAccessible, repository } = createHarness()
    await service.upsertGeotechnical(
      'p1',
      {
        soilType: 'Clay',
        soilBearingCapacity: '100',
        groundwaterLevel: null,
        foundationRecommendation: 'Raft',
        reportFilePath: 'path/report.pdf',
        consultantName: 'Dr',
        status: 'IN_PROGRESS',
        startDate: '2026-01-01T00:00:00.000Z',
        completionDate: '2026-02-01T00:00:00.000Z',
        notes: 'Notes',
      },
      { id: 'owner-1', roles: ['MANAGER'] },
    )
    expect(assertAccessible).toHaveBeenCalledWith('p1', {
      id: 'owner-1',
      roles: ['MANAGER'],
    })
    expect(repository.upsertGeotechnical).toHaveBeenCalledOnce()
  })

  it('propagates inaccessible project errors', async () => {
    const { service } = createHarness()
    await expect(
      service.getSummary('missing', { id: 'owner-1', roles: ['MANAGER'] }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('marks summary complete after a saved geotechnical row', async () => {
    const { service, repository } = createHarness()
    vi.mocked(repository.findAllByProjectId).mockResolvedValueOnce({
      geotechnical: geo,
      design: null,
      licensing: null,
      materials: null,
      maintenance: null,
    })
    const summary = await service.getSummary('p1', { id: 'owner-1', roles: ['MANAGER'] })
    expect(summary.geotechnical).toEqual({
      exists: true,
      isComplete: true,
      data: geo,
    })
  })
})
