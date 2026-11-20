import { apiRequest } from './api'

export type ProjectStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'

export type StageKey = 'geotechnical' | 'design' | 'licensing' | 'materials' | 'maintenance'

export const STAGE_KEYS: StageKey[] = [
  'geotechnical',
  'design',
  'licensing',
  'materials',
  'maintenance',
]

export const STAGE_LABELS: Record<StageKey, string> = {
  geotechnical: 'Geotechnical',
  design: 'Design',
  licensing: 'Licensing',
  materials: 'Materials',
  maintenance: 'Maintenance',
}

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

export type UpsertGeotechnicalInput = GeotechnicalStudy
export type UpsertDesignInput = ProjectDesign
export type UpsertLicensingInput = ProjectLicensing
export type UpsertMaterialsInput = MaterialProcurement
export type UpsertMaintenanceInput = ProjectMaintenance

export function getProjectStagesSummary(projectId: string) {
  return apiRequest<{ data: ProjectStagesSummary }>(`/projects/${projectId}/stages`)
}

/** One round-trip for several project stage summaries (PM home carousel). */
export function getProjectStagesSummaries(projectIds: string[]) {
  return apiRequest<{ data: Record<string, ProjectStagesSummary> }>('/projects/stages/summaries', {
    method: 'POST',
    body: JSON.stringify({ projectIds }),
  })
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
