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

export function isGeotechnicalComplete(
  data: Pick<
    GeotechnicalStudy,
    | 'soilType'
    | 'soilBearingCapacity'
    | 'foundationRecommendation'
    | 'reportFilePath'
    | 'consultantName'
    | 'status'
    | 'startDate'
    | 'completionDate'
    | 'notes'
  >,
): boolean {
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

export function isDesignComplete(
  data: Pick<
    ProjectDesign,
    | 'architecturalDesignPath'
    | 'structuralDesignPath'
    | 'mepDesignPath'
    | 'architectName'
    | 'structuralEngineerName'
    | 'mepEngineerName'
    | 'status'
    | 'startDate'
    | 'completionDate'
    | 'notes'
  >,
): boolean {
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

export function isLicensingComplete(
  data: Pick<
    ProjectLicensing,
    'permitNumber' | 'issuingAuthority' | 'applicationDate' | 'permitFilePath' | 'status' | 'notes'
  >,
): boolean {
  return (
    filled(data.permitNumber) &&
    filled(data.issuingAuthority) &&
    filled(data.applicationDate) &&
    filled(data.permitFilePath) &&
    filled(data.status) &&
    filled(data.notes)
  )
}

export function isMaterialsComplete(
  data: Pick<
    MaterialProcurement,
    | 'supplierName'
    | 'materialDescription'
    | 'quantity'
    | 'unit'
    | 'totalCost'
    | 'currency'
    | 'originCountry'
    | 'orderDate'
    | 'expectedArrivalDate'
    | 'invoiceFilePath'
    | 'status'
    | 'notes'
  >,
): boolean {
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

export function isMaintenanceComplete(
  data: Pick<
    ProjectMaintenance,
    | 'maintenanceType'
    | 'description'
    | 'responsiblePerson'
    | 'scheduledDate'
    | 'cost'
    | 'status'
    | 'reportFilePath'
    | 'notes'
  >,
): boolean {
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
