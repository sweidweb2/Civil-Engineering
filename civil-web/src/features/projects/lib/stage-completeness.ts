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

export type ChecklistItem = {
  key: string
  labelKey: string
  done: boolean
}

export function geotechnicalChecklist(data: UpsertGeotechnicalInput): ChecklistItem[] {
  return [
    { key: 'soilType', labelKey: 'stages.fields.soilType', done: filled(data.soilType) },
    {
      key: 'soilBearingCapacity',
      labelKey: 'stages.fields.soilBearingCapacity',
      done: filled(data.soilBearingCapacity),
    },
    {
      key: 'consultantName',
      labelKey: 'stages.fields.consultantName',
      done: filled(data.consultantName),
    },
    { key: 'startDate', labelKey: 'stages.fields.startDate', done: filled(data.startDate) },
    {
      key: 'completionDate',
      labelKey: 'stages.fields.completionDate',
      done: filled(data.completionDate),
    },
    {
      key: 'reportFilePath',
      labelKey: 'stages.fields.reportFilePath',
      done: filled(data.reportFilePath),
    },
  ]
}

export function designChecklist(data: UpsertDesignInput): ChecklistItem[] {
  return [
    {
      key: 'architectName',
      labelKey: 'stages.fields.architectName',
      done: filled(data.architectName),
    },
    {
      key: 'structuralEngineerName',
      labelKey: 'stages.fields.structuralEngineerName',
      done: filled(data.structuralEngineerName),
    },
    {
      key: 'mepEngineerName',
      labelKey: 'stages.fields.mepEngineerName',
      done: filled(data.mepEngineerName),
    },
    { key: 'startDate', labelKey: 'stages.fields.startDate', done: filled(data.startDate) },
    {
      key: 'completionDate',
      labelKey: 'stages.fields.completionDate',
      done: filled(data.completionDate),
    },
    {
      key: 'architecturalDesignPath',
      labelKey: 'stages.fields.architecturalDesignPath',
      done: filled(data.architecturalDesignPath),
    },
    {
      key: 'structuralDesignPath',
      labelKey: 'stages.fields.structuralDesignPath',
      done: filled(data.structuralDesignPath),
    },
    {
      key: 'mepDesignPath',
      labelKey: 'stages.fields.mepDesignPath',
      done: filled(data.mepDesignPath),
    },
  ]
}

export function licensingChecklist(data: UpsertLicensingInput): ChecklistItem[] {
  return [
    {
      key: 'permitNumber',
      labelKey: 'stages.fields.permitNumber',
      done: filled(data.permitNumber),
    },
    {
      key: 'issuingAuthority',
      labelKey: 'stages.fields.issuingAuthority',
      done: filled(data.issuingAuthority),
    },
    {
      key: 'applicationDate',
      labelKey: 'stages.fields.applicationDate',
      done: filled(data.applicationDate),
    },
    {
      key: 'permitFilePath',
      labelKey: 'stages.fields.permitFilePath',
      done: filled(data.permitFilePath),
    },
  ]
}

export function materialsChecklist(data: UpsertMaterialsInput): ChecklistItem[] {
  return [
    {
      key: 'supplierName',
      labelKey: 'stages.fields.supplierName',
      done: filled(data.supplierName),
    },
    {
      key: 'materialDescription',
      labelKey: 'stages.fields.materialDescription',
      done: filled(data.materialDescription),
    },
    { key: 'quantity', labelKey: 'stages.fields.quantity', done: filled(data.quantity) },
    { key: 'unit', labelKey: 'stages.fields.unit', done: filled(data.unit) },
    { key: 'totalCost', labelKey: 'stages.fields.totalCost', done: filled(data.totalCost) },
    { key: 'currency', labelKey: 'stages.fields.currency', done: filled(data.currency) },
    {
      key: 'originCountry',
      labelKey: 'stages.fields.originCountry',
      done: filled(data.originCountry),
    },
    { key: 'orderDate', labelKey: 'stages.fields.orderDate', done: filled(data.orderDate) },
    {
      key: 'expectedArrivalDate',
      labelKey: 'stages.fields.expectedArrivalDate',
      done: filled(data.expectedArrivalDate),
    },
    {
      key: 'invoiceFilePath',
      labelKey: 'stages.fields.invoiceFilePath',
      done: filled(data.invoiceFilePath),
    },
  ]
}

export function maintenanceChecklist(data: UpsertMaintenanceInput): ChecklistItem[] {
  return [
    {
      key: 'maintenanceType',
      labelKey: 'stages.fields.maintenanceType',
      done: filled(data.maintenanceType),
    },
    { key: 'description', labelKey: 'stages.fields.description', done: filled(data.description) },
    {
      key: 'responsiblePerson',
      labelKey: 'stages.fields.responsiblePerson',
      done: filled(data.responsiblePerson),
    },
    {
      key: 'scheduledDate',
      labelKey: 'stages.fields.scheduledDate',
      done: filled(data.scheduledDate),
    },
    { key: 'cost', labelKey: 'stages.fields.cost', done: filled(data.cost) },
    {
      key: 'reportFilePath',
      labelKey: 'stages.fields.reportFilePath',
      done: filled(data.reportFilePath),
    },
  ]
}

export function missingCount(items: ChecklistItem[]): number {
  return items.filter((item) => !item.done).length
}
