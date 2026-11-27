import type { TFunction } from 'i18next'

export type EnumGroup =
  | 'projectStatus'
  | 'projectType'
  | 'listingType'
  | 'reviewTarget'
  | 'listingStatus'
  | 'rentalUnit'
  | 'providerStatus'
  | 'reviewStatus'
  | 'categoryKind'
  | 'userStatus'
  | 'role'
  | 'stageStatus'
  | 'stage'
  | 'workerAvailability'
  | 'workerSkillLevel'
  | 'verificationStatus'
  | 'projectWorkerStatus'
  | 'projectTaskStatus'

/** Translated label for a backend enum value (falls back to the raw value). */
export function enumLabel(
  t: TFunction,
  group: EnumGroup,
  value: string | null | undefined,
): string {
  if (!value) return '—'
  return t(`enums.${group}.${value}`, { defaultValue: value })
}

/** Turns a service option list into translated `{ value, label }` options. */
export function enumOptions(
  t: TFunction,
  group: EnumGroup,
  values: readonly { value: string }[],
): { value: string; label: string }[] {
  return values.map((option) => ({ value: option.value, label: enumLabel(t, group, option.value) }))
}
