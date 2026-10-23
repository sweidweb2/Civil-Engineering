import { validationError } from '../../errors/app-error.js'
import type { StepperInputValuePayload } from './project-steppers.schema.js'

const TEXT_MAX = 2000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function assertValidStepperValue(
  inputTypeCode: string,
  label: string,
  value: StepperInputValuePayload,
): void {
  if (value === null) return

  const code = inputTypeCode.toUpperCase()

  if (code === 'YES_NO') {
    if (typeof value !== 'boolean') {
      throw validationError(`"${label}" must be yes/no`)
    }
    return
  }

  if (code === 'NUMBER') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw validationError(`"${label}" must be a finite number`)
    }
    if (Math.abs(value) > 1e15) {
      throw validationError(`"${label}" is out of range`)
    }
    return
  }

  if (code === 'DATE') {
    if (typeof value !== 'string' || !DATE_RE.test(value)) {
      throw validationError(`"${label}" must be a date (YYYY-MM-DD)`)
    }
    const parsed = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(parsed.getTime())) {
      throw validationError(`"${label}" is not a valid date`)
    }
    return
  }

  // TEXT and any other/future type: store as string with length limit
  if (typeof value !== 'string') {
    throw validationError(`"${label}" must be text`)
  }
  if (value.length > TEXT_MAX) {
    throw validationError(`"${label}" must be at most ${TEXT_MAX} characters`)
  }
}
