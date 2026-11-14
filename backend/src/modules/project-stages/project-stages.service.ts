import type { AuthActor } from '../../authz/index.js'
import { conflict, isUniqueConflictError } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/projects.service.js'
import {
  isDesignComplete,
  isGeotechnicalComplete,
  isLicensingComplete,
  isMaintenanceComplete,
  isMaterialsComplete,
} from './project-stages.completeness.js'
import type { ProjectStagesRepository } from './project-stages.repository.js'
import type {
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

function slot<T>(data: T | null, isComplete: (value: T) => boolean): StageSlot<T> {
  if (!data) return { exists: false, isComplete: false, data: null }
  return { exists: true, isComplete: isComplete(data), data }
}

export type ProjectStagesService = {
  getSummary: (projectId: string, actor: AuthActor) => Promise<ProjectStagesSummary>
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
      const rows = await repository.findAllByProjectId(projectId)
      return {
        geotechnical: slot(rows.geotechnical, isGeotechnicalComplete),
        design: slot(rows.design, isDesignComplete),
        licensing: slot(rows.licensing, isLicensingComplete),
        materials: slot(rows.materials, isMaterialsComplete),
        maintenance: slot(rows.maintenance, isMaintenanceComplete),
      }
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
