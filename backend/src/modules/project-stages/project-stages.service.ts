import { assertOwnerOrAdmin, type AuthActor } from '../../authz/index.js'
import { conflict, isUniqueConflictError } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/index.js'
import {
  designMissing,
  geotechnicalMissing,
  isDesignComplete,
  isGeotechnicalComplete,
  isLicensingComplete,
  isMaintenanceComplete,
  isMaterialsComplete,
  licensingMissing,
  maintenanceMissing,
  materialsMissing,
} from './project-stages.completeness.js'
import type { ProjectStagesRepository } from './project-stages.repository.js'
import type {
  BatchStageSummariesBody,
  UpsertDesignBody,
  UpsertGeotechnicalBody,
  UpsertLicensingBody,
  UpsertMaintenanceBody,
  UpsertMaterialsBody,
} from './project-stages.schema.js'
import type {
  GeotechnicalStudy,
  MaterialProcurement,
  ProjectDesign,
  ProjectLicensing,
  ProjectMaintenance,
  ProjectStagesSummary,
  StageSlot,
} from './project-stages.types.js'

function slot<T>(
  data: T | null,
  isComplete: (value: T) => boolean,
  missing: (value: T) => string[],
): StageSlot<T> {
  if (!data) return { exists: false, isComplete: false, missingCount: 0, data: null }
  const missingKeys = missing(data)
  return {
    exists: true,
    isComplete: isComplete(data),
    missingCount: missingKeys.length,
    data,
  }
}

function toSummary(rows: {
  geotechnical: GeotechnicalStudy | null
  design: ProjectDesign | null
  licensing: ProjectLicensing | null
  materials: MaterialProcurement | null
  maintenance: ProjectMaintenance | null
}): ProjectStagesSummary {
  return {
    geotechnical: slot(rows.geotechnical, isGeotechnicalComplete, geotechnicalMissing),
    design: slot(rows.design, isDesignComplete, designMissing),
    licensing: slot(rows.licensing, isLicensingComplete, licensingMissing),
    materials: slot(rows.materials, isMaterialsComplete, materialsMissing),
    maintenance: slot(rows.maintenance, isMaintenanceComplete, maintenanceMissing),
  }
}

export type ProjectStagesService = {
  getSummary: (projectId: string, actor: AuthActor) => Promise<ProjectStagesSummary>
  getSummaries: (
    input: BatchStageSummariesBody,
    actor: AuthActor,
  ) => Promise<Record<string, ProjectStagesSummary>>
  getGeotechnical: (projectId: string, actor: AuthActor) => Promise<GeotechnicalStudy | null>
  upsertGeotechnical: (
    projectId: string,
    body: UpsertGeotechnicalBody,
    actor: AuthActor,
  ) => Promise<GeotechnicalStudy>
  getDesign: (projectId: string, actor: AuthActor) => Promise<ProjectDesign | null>
  upsertDesign: (
    projectId: string,
    body: UpsertDesignBody,
    actor: AuthActor,
  ) => Promise<ProjectDesign>
  getLicensing: (projectId: string, actor: AuthActor) => Promise<ProjectLicensing | null>
  upsertLicensing: (
    projectId: string,
    body: UpsertLicensingBody,
    actor: AuthActor,
  ) => Promise<ProjectLicensing>
  getMaterials: (projectId: string, actor: AuthActor) => Promise<MaterialProcurement | null>
  upsertMaterials: (
    projectId: string,
    body: UpsertMaterialsBody,
    actor: AuthActor,
  ) => Promise<MaterialProcurement>
  getMaintenance: (projectId: string, actor: AuthActor) => Promise<ProjectMaintenance | null>
  upsertMaintenance: (
    projectId: string,
    body: UpsertMaintenanceBody,
    actor: AuthActor,
  ) => Promise<ProjectMaintenance>
}

export type ProjectStagesServiceDeps = {
  repository: ProjectStagesRepository
  projectsService: ProjectsService
}

async function withUniqueRetry<T>(run: () => Promise<T>, message: string): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (isUniqueConflictError(error)) {
      throw conflict(message)
    }
    throw error
  }
}

export function createProjectStagesService(deps: ProjectStagesServiceDeps): ProjectStagesService {
  const { repository, projectsService } = deps

  async function assertProject(projectId: string, actor: AuthActor) {
    return projectsService.assertAccessible(projectId, actor)
  }

  return {
    async getSummary(projectId, actor) {
      await assertProject(projectId, actor)
      return toSummary(await repository.findAllByProjectId(projectId))
    },

    async getSummaries(input, actor) {
      const uniqueIds = [...new Set(input.projectIds)]
      const rows = await repository.findAllByProjectIds(uniqueIds)
      const data: Record<string, ProjectStagesSummary> = {}
      for (const row of rows) {
        try {
          assertOwnerOrAdmin(actor, row.ownerId)
        } catch {
          continue
        }
        data[row.projectId] = toSummary(row)
      }
      return data
    },

    async getGeotechnical(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.findGeotechnical(projectId)
    },

    async upsertGeotechnical(projectId, body, actor) {
      await assertProject(projectId, actor)
      return withUniqueRetry(
        () => repository.upsertGeotechnical(projectId, body),
        'Geotechnical study already exists for this project',
      )
    },

    async getDesign(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.findDesign(projectId)
    },

    async upsertDesign(projectId, body, actor) {
      await assertProject(projectId, actor)
      return withUniqueRetry(
        () => repository.upsertDesign(projectId, body),
        'Design already exists for this project',
      )
    },

    async getLicensing(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.findLicensing(projectId)
    },

    async upsertLicensing(projectId, body, actor) {
      await assertProject(projectId, actor)
      return withUniqueRetry(
        () => repository.upsertLicensing(projectId, body),
        'Licensing already exists for this project',
      )
    },

    async getMaterials(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.findMaterials(projectId)
    },

    async upsertMaterials(projectId, body, actor) {
      await assertProject(projectId, actor)
      return withUniqueRetry(
        () => repository.upsertMaterials(projectId, body),
        'Material procurement already exists for this project',
      )
    },

    async getMaintenance(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.findMaintenance(projectId)
    },

    async upsertMaintenance(projectId, body, actor) {
      await assertProject(projectId, actor)
      return withUniqueRetry(
        () => repository.upsertMaintenance(projectId, body),
        'Maintenance already exists for this project',
      )
    },
  }
}
