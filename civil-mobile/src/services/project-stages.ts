import { apiRequest } from './api'
import { getProjectById, type PaginatedProjects, type Project } from './projects'

export type ProjectStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'

export type StageKey = 'geotechnical' | 'design' | 'licensing' | 'materials' | 'maintenance'

export const STAGE_KEYS: StageKey[] = [
  'geotechnical',
  'design',
  'licensing',
  'materials',
  'maintenance',
]

export const PROJECT_STAGE_STATUS_OPTIONS: { value: ProjectStageStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On hold' },
]

export type GeotechnicalStudy = {
  soilType: string
  soilBearingCapacity: string
  groundwaterLevel: string | null
  foundationRecommendation: string
  reportFilePath: string
  consultantName: string
  status: ProjectStageStatus
  startDate: string
  completionDate: string
  notes: string
  updatedAt: string
}

export type ProjectDesign = {
  architecturalDesignPath: string
  structuralDesignPath: string
  mepDesignPath: string
  architectName: string
  structuralEngineerName: string
  mepEngineerName: string
  status: ProjectStageStatus
  startDate: string
  completionDate: string
  notes: string
  updatedAt: string
}

export type ProjectLicensing = {
  permitNumber: string
  issuingAuthority: string
  applicationDate: string
  approvalDate: string | null
  permitFilePath: string
  status: ProjectStageStatus
  expiryDate: string | null
  notes: string
  updatedAt: string
}

export type MaterialProcurement = {
  supplierName: string
  materialDescription: string
  quantity: string
  unit: string
  totalCost: string
  currency: string
  originCountry: string
  orderDate: string
  expectedArrivalDate: string
  actualArrivalDate: string | null
  invoiceFilePath: string
  status: ProjectStageStatus
  notes: string
  updatedAt: string
}

export type ProjectMaintenance = {
  maintenanceType: string
  description: string
  responsiblePerson: string
  scheduledDate: string
  completionDate: string | null
  cost: string
  status: ProjectStageStatus
  reportFilePath: string
  notes: string
  updatedAt: string
}

export type StageSlot<T> = {
  exists: boolean
  isComplete: boolean
  missingCount: number
  data: T | null
}

export type ProjectStagesSummary = {
  geotechnical: StageSlot<GeotechnicalStudy>
  design: StageSlot<ProjectDesign>
  licensing: StageSlot<ProjectLicensing>
  materials: StageSlot<MaterialProcurement>
  maintenance: StageSlot<ProjectMaintenance>
}

type StageConcurrency = {
  /** ISO timestamp loaded from the API; null only on first create. */
  expectedUpdatedAt: string | null
}

export type UpsertGeotechnicalInput = Omit<GeotechnicalStudy, 'updatedAt'> & StageConcurrency
export type UpsertDesignInput = Omit<ProjectDesign, 'updatedAt'> & StageConcurrency
export type UpsertLicensingInput = Omit<ProjectLicensing, 'updatedAt'> & StageConcurrency
export type UpsertMaterialsInput = Omit<MaterialProcurement, 'updatedAt'> & StageConcurrency
export type UpsertMaintenanceInput = Omit<ProjectMaintenance, 'updatedAt'> & StageConcurrency

const EMPTY_STAGE_SLOT = {
  exists: false,
  isComplete: false,
  missingCount: 0,
  data: null,
} as const

/** Empty stage board when the stages half of a detail load fails. */
export function emptyProjectStagesSummary(): ProjectStagesSummary {
  return {
    geotechnical: { ...EMPTY_STAGE_SLOT },
    design: { ...EMPTY_STAGE_SLOT },
    licensing: { ...EMPTY_STAGE_SLOT },
    materials: { ...EMPTY_STAGE_SLOT },
    maintenance: { ...EMPTY_STAGE_SLOT },
  }
}

export function getProjectStagesSummary(projectId: string) {
  return apiRequest<{ data: ProjectStagesSummary }>(`/projects/${projectId}/stages`)
}

export type ProjectDetailResponse = {
  data: { project: Project; stages: ProjectStagesSummary }
}

/**
 * Project + stage summary in one round-trip.
 * If the bundled endpoint fails, falls back to independent project + stages calls
 * so one half can still render.
 */
export async function getProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
  try {
    return await apiRequest<ProjectDetailResponse>(`/projects/${projectId}/detail`)
  } catch (bundledError) {
    const [projectResult, stagesResult] = await Promise.allSettled([
      getProjectById(projectId),
      getProjectStagesSummary(projectId),
    ])
    if (projectResult.status === 'rejected' && stagesResult.status === 'rejected') {
      throw bundledError
    }
    if (projectResult.status === 'rejected') {
      throw projectResult.reason
    }
    return {
      data: {
        project: projectResult.value.data,
        stages:
          stagesResult.status === 'fulfilled'
            ? stagesResult.value.data
            : emptyProjectStagesSummary(),
      },
    }
  }
}

/** One round-trip for several project stage summaries (PM home carousel). */
export function getProjectStagesSummaries(projectIds: string[]) {
  return apiRequest<{ data: Record<string, ProjectStagesSummary> }>('/projects/stages/summaries', {
    method: 'POST',
    body: JSON.stringify({ projectIds }),
  })
}

/** Page 1 of own projects + status summary + each listed project's stage summary. */
export type ProjectsOverview = PaginatedProjects & {
  stages: Record<string, ProjectStagesSummary>
}

/** PM home in one round-trip (`GET /projects/stages/overview`). */
export function getProjectsOverview(limit = 20) {
  return apiRequest<ProjectsOverview>(`/projects/stages/overview?limit=${limit}`)
}

export function upsertGeotechnical(projectId: string, body: UpsertGeotechnicalInput) {
  return apiRequest<{ data: GeotechnicalStudy }>(`/projects/${projectId}/stages/geotechnical`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function upsertDesign(projectId: string, body: UpsertDesignInput) {
  return apiRequest<{ data: ProjectDesign }>(`/projects/${projectId}/stages/design`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function upsertLicensing(projectId: string, body: UpsertLicensingInput) {
  return apiRequest<{ data: ProjectLicensing }>(`/projects/${projectId}/stages/licensing`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function upsertMaterials(projectId: string, body: UpsertMaterialsInput) {
  return apiRequest<{ data: MaterialProcurement }>(`/projects/${projectId}/stages/materials`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function upsertMaintenance(projectId: string, body: UpsertMaintenanceInput) {
  return apiRequest<{ data: ProjectMaintenance }>(`/projects/${projectId}/stages/maintenance`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
