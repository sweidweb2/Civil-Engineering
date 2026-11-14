import { validationError } from '../../errors/app-error.js'
import type { ListingSnapshot } from '../listings/listings.types.js'
import type { StepperInputValuePayload } from './projects.steppers.schema.js'

const TEXT_MAX = 2000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Single place that canonicalizes an input type code for comparisons. */
export function normalizeInputTypeCode(inputTypeCode: string): string {
  return inputTypeCode.toUpperCase()
}

export function isFileInputType(inputTypeCode: string): boolean {
  return normalizeInputTypeCode(inputTypeCode) === 'FILE'
}

/** Extract a listing id from a CATEGORY write value (id string or snapshot with id). */
export function listingIdFromValue(value: StepperInputValuePayload): string | null {
  if (value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  ) {
    const trimmed = value.id.trim()
    return trimmed === '' ? null : trimmed
  }
  return null
}

/** Extract a file id from a FILE write value (id string or snapshot with id). */
export function fileIdFromValue(value: StepperInputValuePayload): string | null {
  if (value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'originalName' in value
  ) {
    const trimmed = value.id.trim()
    return trimmed === '' ? null : trimmed
  }
  return null
}

export function assertValidStepperValue(
  inputTypeCode: string,
  label: string,
  value: StepperInputValuePayload,
): void {
  if (value === null) return

  const code = normalizeInputTypeCode(inputTypeCode)

  if (code === 'CATEGORY') {
    const listingId = listingIdFromValue(value)
    if (!listingId) {
      throw validationError(`"${label}" must be a listing selection`)
    }
    return
  }

  if (code === 'FILE') {
    const fileId = fileIdFromValue(value)
    if (!fileId) {
      throw validationError(`"${label}" must be a file selection`)
    }
    return
  }

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

export function assertListingMatchesCategory(
  label: string,
  snapshot: ListingSnapshot,
  categoryId: string | null,
): void {
  if (!categoryId) {
    throw validationError(`"${label}" is missing a category binding`)
  }
  if (snapshot.status !== 'ACTIVE') {
    throw validationError(`"${label}" must reference an active listing`)
  }
  if (snapshot.categoryId !== categoryId) {
    throw validationError(`"${label}" listing must belong to the bound category`)
  }
}
