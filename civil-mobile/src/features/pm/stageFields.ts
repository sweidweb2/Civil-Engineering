import type { StageDraft } from '@/features/pm/stagePayloads'
import type { ProjectStagesSummary, ProjectStageStatus, StageKey } from '@/services/project-stages'

/** Per-stage form fields and file slots for the project stages editor. */

function emptyDraft(status: ProjectStageStatus = 'NOT_STARTED'): StageDraft {
  return { status }
}

export function draftFromSummary(summary: ProjectStagesSummary, key: StageKey): StageDraft {
  const slot = summary[key]
  if (!slot.data) return emptyDraft()
  const draft: StageDraft = {}
  for (const [field, value] of Object.entries(slot.data)) {
    draft[field] = value == null ? '' : String(value)
  }
  return draft
}

export function fieldsForStage(key: StageKey): { key: string; multiline?: boolean }[] {
  switch (key) {
    case 'geotechnical':
      return [
        { key: 'soilType' },
        { key: 'soilBearingCapacity' },
        { key: 'groundwaterLevel' },
        { key: 'foundationRecommendation', multiline: true },
        { key: 'consultantName' },
        { key: 'startDate' },
        { key: 'completionDate' },
        { key: 'notes', multiline: true },
      ]
    case 'design':
      return [
        { key: 'architectName' },
        { key: 'structuralEngineerName' },
        { key: 'mepEngineerName' },
        { key: 'startDate' },
        { key: 'completionDate' },
        { key: 'notes', multiline: true },
      ]
    case 'licensing':
      return [
        { key: 'permitNumber' },
        { key: 'issuingAuthority' },
        { key: 'applicationDate' },
        { key: 'approvalDate' },
        { key: 'expiryDate' },
        { key: 'notes', multiline: true },
      ]
    case 'materials':
      return [
        { key: 'supplierName' },
        { key: 'materialDescription', multiline: true },
        { key: 'quantity' },
        { key: 'unit' },
        { key: 'totalCost' },
        { key: 'currency' },
        { key: 'originCountry' },
        { key: 'orderDate' },
        { key: 'expectedArrivalDate' },
        { key: 'actualArrivalDate' },
        { key: 'notes', multiline: true },
      ]
    case 'maintenance':
      return [
        { key: 'maintenanceType' },
        { key: 'description', multiline: true },
        { key: 'responsiblePerson' },
        { key: 'scheduledDate' },
        { key: 'completionDate' },
        { key: 'cost' },
        { key: 'notes', multiline: true },
      ]
  }
}

/** Draft keys that hold an uploaded file's storage key, per stage. */
export function fileFieldsForStage(key: StageKey): string[] {
  switch (key) {
    case 'geotechnical':
      return ['reportFilePath']
    case 'design':
      return ['architecturalDesignPath', 'structuralDesignPath', 'mepDesignPath']
    case 'licensing':
      return ['permitFilePath']
    case 'materials':
      return ['invoiceFilePath']
    case 'maintenance':
      return ['reportFilePath']
  }
}
