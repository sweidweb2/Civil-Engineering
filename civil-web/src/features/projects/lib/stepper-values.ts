import {
  isFileSnapshot,
  listingIdFromStepperValue,
  type ProjectStepInputField,
  type ProjectStepNode,
  type StepperValue,
} from '@/services/project-steppers'

export const STEPPER_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export type NodePhase = 'done' | 'current' | 'upcoming'

export function resolveNodePhase(nodes: ProjectStepNode[], nodeId: string): NodePhase {
  const firstOpenIndex = nodes.findIndex((node) => !node.isComplete)
  const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
  if (nodeIndex < 0) return 'upcoming'
  if (nodes[nodeIndex]?.isComplete) return 'done'
  if (firstOpenIndex < 0 || nodeIndex === firstOpenIndex) return 'current'
  if (nodeIndex < firstOpenIndex) return 'done'
  return 'upcoming'
}

/** Parse YYYY-MM-DD as a local calendar date (avoid UTC off-by-one). */
export function toDate(value: StepperValue): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDateValue(date: Date | undefined): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isFilledValue(value: StepperValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'object') return Boolean(value.id)
  return true
}

export function draftValueForInput(input: ProjectStepInputField): StepperValue {
  const code = input.inputTypeCode.toUpperCase()
  if (code === 'CATEGORY') {
    return listingIdFromStepperValue(input.value)
  }
  if (code === 'FILE') {
    return input.value
  }
  return input.value
}

export function fileDisplayName(value: StepperValue): string | null {
  if (isFileSnapshot(value)) return value.originalName
  return null
}

export function fileMime(value: StepperValue): string | null {
  if (isFileSnapshot(value)) return value.mime
  return null
}

export function isImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.toLowerCase().startsWith('image/'))
}

function nodeStatsFromInputs(inputs: ProjectStepInputField[]) {
  const inputCount = inputs.length
  const filledCount = inputs.filter((input) => isFilledValue(input.value)).length
  return {
    inputCount,
    filledCount,
    isComplete: filledCount === inputCount,
  }
}

export function patchNode(
  nodes: ProjectStepNode[],
  projectStepId: string,
  inputs: ProjectStepInputField[],
): ProjectStepNode[] {
  const stats = nodeStatsFromInputs(inputs)
  return nodes.map((node) => (node.id === projectStepId ? { ...node, ...stats } : node))
}

/** Wider columns when few steps; tighten as count grows (track still scrolls when too dense). */
export function stepperColumnWidthRem(count: number): number {
  if (count <= 3) return 12
  if (count <= 5) return 10.5
  if (count <= 7) return 9
  if (count <= 10) return 7.5
  return 6.25
}
