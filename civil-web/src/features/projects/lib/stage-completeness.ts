import type {
  UpsertDesignInput,
  UpsertGeotechnicalInput,
  UpsertLicensingInput,
  UpsertMaintenanceInput,
  UpsertMaterialsInput,
} from '@/services/project-stages'

function filled(value: string | null | undefined): boolean {
  return value != null && value.trim() !== ''
}

export function isGeotechnicalDraftComplete(data: UpsertGeotechnicalInput): boolean {
  return (
    filled(data.soilType) &&
    filled(data.soilBearingCapacity) &&
    filled(data.foundationRecommendation) &&
    filled(data.reportFilePath) &&
    filled(data.consultantName) &&
    filled(data.status) &&
    filled(data.startDate) &&
    filled(data.completionDate) &&
    filled(data.notes)
  )
}

export function isDesignDraftComplete(data: UpsertDesignInput): boolean {
  return (
    filled(data.architecturalDesignPath) &&
    filled(data.structuralDesignPath) &&
    filled(data.mepDesignPath) &&
    filled(data.architectName) &&
    filled(data.structuralEngineerName) &&
    filled(data.mepEngineerName) &&
    filled(data.status) &&
    filled(data.startDate) &&
    filled(data.completionDate) &&
    filled(data.notes)
  )
}

export function isLicensingDraftComplete(data: UpsertLicensingInput): boolean {
  return (
    filled(data.permitNumber) &&
    filled(data.issuingAuthority) &&
    filled(data.applicationDate) &&
    filled(data.permitFilePath) &&
    filled(data.status) &&
    filled(data.notes)
  )
}

export function isMaterialsDraftComplete(data: UpsertMaterialsInput): boolean {
  return (
    filled(data.supplierName) &&
    filled(data.materialDescription) &&
    filled(data.quantity) &&
    filled(data.unit) &&
    filled(data.totalCost) &&
    filled(data.currency) &&
    filled(data.originCountry) &&
    filled(data.orderDate) &&
    filled(data.expectedArrivalDate) &&
    filled(data.invoiceFilePath) &&
    filled(data.status) &&
    filled(data.notes)
  )
}

export function isMaintenanceDraftComplete(data: UpsertMaintenanceInput): boolean {
  return (
    filled(data.maintenanceType) &&
    filled(data.description) &&
    filled(data.responsiblePerson) &&
    filled(data.scheduledDate) &&
    filled(data.cost) &&
    filled(data.status) &&
    filled(data.reportFilePath) &&
    filled(data.notes)
  )
}
