import type {
  GeotechnicalStudy,
  MaterialProcurement,
  ProjectDesign,
  ProjectLicensing,
  ProjectMaintenance,
} from './project-stages.types.js'

function filled(value: string | null | undefined): boolean {
  return value != null && value.trim() !== ''
}

export const GEOTECHNICAL_REQUIRED = [
  'soilType',
  'soilBearingCapacity',
  'foundationRecommendation',
  'reportFilePath',
  'consultantName',
  'startDate',
  'completionDate',
] as const

export const DESIGN_REQUIRED = [
  'architecturalDesignPath',
  'structuralDesignPath',
  'mepDesignPath',
  'architectName',
  'structuralEngineerName',
  'mepEngineerName',
  'startDate',
  'completionDate',
] as const

export const LICENSING_REQUIRED = [
  'permitNumber',
  'issuingAuthority',
  'applicationDate',
  'permitFilePath',
] as const

export const MATERIALS_REQUIRED = [
  'supplierName',
  'materialDescription',
  'quantity',
  'unit',
  'totalCost',
  'currency',
  'originCountry',
  'orderDate',
  'expectedArrivalDate',
  'invoiceFilePath',
] as const

export const MAINTENANCE_REQUIRED = [
  'maintenanceType',
  'description',
  'responsiblePerson',
  'scheduledDate',
  'cost',
  'reportFilePath',
] as const

function missingFrom<T extends Record<string, string | null | undefined>>(
  data: T,
  keys: readonly (keyof T)[],
): string[] {
  return keys.filter((key) => !filled(data[key] as string | null | undefined)) as string[]
}

export function geotechnicalMissing(data: Partial<GeotechnicalStudy>): string[] {
  return missingFrom(data as Record<string, string | null | undefined>, [...GEOTECHNICAL_REQUIRED])
}

export function designMissing(data: Partial<ProjectDesign>): string[] {
  return missingFrom(data as Record<string, string | null | undefined>, [...DESIGN_REQUIRED])
}

export function licensingMissing(data: Partial<ProjectLicensing>): string[] {
  return missingFrom(data as Record<string, string | null | undefined>, [...LICENSING_REQUIRED])
}

export function materialsMissing(data: Partial<MaterialProcurement>): string[] {
  return missingFrom(data as Record<string, string | null | undefined>, [...MATERIALS_REQUIRED])
}

export function maintenanceMissing(data: Partial<ProjectMaintenance>): string[] {
  return missingFrom(data as Record<string, string | null | undefined>, [...MAINTENANCE_REQUIRED])
}

export function isGeotechnicalComplete(data: Partial<GeotechnicalStudy>): boolean {
  return geotechnicalMissing(data).length === 0
}

export function isDesignComplete(data: Partial<ProjectDesign>): boolean {
  return designMissing(data).length === 0
}

export function isLicensingComplete(data: Partial<ProjectLicensing>): boolean {
  return licensingMissing(data).length === 0
}

export function isMaterialsComplete(data: Partial<MaterialProcurement>): boolean {
  return materialsMissing(data).length === 0
}

export function isMaintenanceComplete(data: Partial<ProjectMaintenance>): boolean {
  return maintenanceMissing(data).length === 0
}
