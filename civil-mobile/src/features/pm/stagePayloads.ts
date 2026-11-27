import {
  type ProjectStageStatus,
  type StageKey,
  upsertDesign,
  upsertGeotechnical,
  upsertLicensing,
  upsertMaintenance,
  upsertMaterials,
} from '@/services/project-stages'

export type StageDraft = Record<string, string>

function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function toRequiredString(value: string | undefined): string {
  return value?.trim() ?? ''
}

/** Builds the stage-specific payload from the form draft and upserts it. */
export function saveStageDraft(projectId: string, key: StageKey, draft: StageDraft) {
  const status = (draft.status as ProjectStageStatus) || 'NOT_STARTED'
  const expectedUpdatedAt = toNullable(draft.expectedUpdatedAt)
  if (key === 'geotechnical') {
    return upsertGeotechnical(projectId, {
      soilType: toRequiredString(draft.soilType),
      soilBearingCapacity: toRequiredString(draft.soilBearingCapacity),
      groundwaterLevel: toNullable(draft.groundwaterLevel),
      foundationRecommendation: toRequiredString(draft.foundationRecommendation),
      reportFilePath: toRequiredString(draft.reportFilePath),
      consultantName: toRequiredString(draft.consultantName),
      status,
      startDate: toRequiredString(draft.startDate),
      completionDate: toRequiredString(draft.completionDate),
      notes: toRequiredString(draft.notes),
      expectedUpdatedAt,
    })
  } else if (key === 'design') {
    return upsertDesign(projectId, {
      architecturalDesignPath: toRequiredString(draft.architecturalDesignPath),
      structuralDesignPath: toRequiredString(draft.structuralDesignPath),
      mepDesignPath: toRequiredString(draft.mepDesignPath),
      architectName: toRequiredString(draft.architectName),
      structuralEngineerName: toRequiredString(draft.structuralEngineerName),
      mepEngineerName: toRequiredString(draft.mepEngineerName),
      status,
      startDate: toRequiredString(draft.startDate),
      completionDate: toRequiredString(draft.completionDate),
      notes: toRequiredString(draft.notes),
      expectedUpdatedAt,
    })
  } else if (key === 'licensing') {
    return upsertLicensing(projectId, {
      permitNumber: toRequiredString(draft.permitNumber),
      issuingAuthority: toRequiredString(draft.issuingAuthority),
      applicationDate: toRequiredString(draft.applicationDate),
      approvalDate: toNullable(draft.approvalDate),
      permitFilePath: toRequiredString(draft.permitFilePath),
      status,
      expiryDate: toNullable(draft.expiryDate),
      notes: toRequiredString(draft.notes),
      expectedUpdatedAt,
    })
  } else if (key === 'materials') {
    return upsertMaterials(projectId, {
      supplierName: toRequiredString(draft.supplierName),
      materialDescription: toRequiredString(draft.materialDescription),
      quantity: toRequiredString(draft.quantity),
      unit: toRequiredString(draft.unit),
      totalCost: toRequiredString(draft.totalCost),
      currency: toRequiredString(draft.currency) || 'USD',
      originCountry: toRequiredString(draft.originCountry),
      orderDate: toRequiredString(draft.orderDate),
      expectedArrivalDate: toRequiredString(draft.expectedArrivalDate),
      actualArrivalDate: toNullable(draft.actualArrivalDate),
      invoiceFilePath: toRequiredString(draft.invoiceFilePath),
      status,
      notes: toRequiredString(draft.notes),
      expectedUpdatedAt,
    })
  } else {
    return upsertMaintenance(projectId, {
      maintenanceType: toRequiredString(draft.maintenanceType),
      description: toRequiredString(draft.description),
      responsiblePerson: toRequiredString(draft.responsiblePerson),
      scheduledDate: toRequiredString(draft.scheduledDate),
      completionDate: toNullable(draft.completionDate),
      cost: toRequiredString(draft.cost),
      status,
      reportFilePath: toRequiredString(draft.reportFilePath),
      notes: toRequiredString(draft.notes),
      expectedUpdatedAt,
    })
  }
}
