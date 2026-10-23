/** Closed set of input type codes SUPER may create (not free-text). */
export const INPUT_TYPE_CODES = ['TEXT', 'NUMBER', 'YES_NO', 'DATE'] as const

export const INPUT_TYPE_CODE_OPTIONS = [
  { code: 'TEXT', label: 'Text' },
  { code: 'NUMBER', label: 'Number' },
  { code: 'YES_NO', label: 'Yes / No' },
  { code: 'DATE', label: 'Date' },
] as const

export type InputTypeCodeOption = (typeof INPUT_TYPE_CODES)[number]

export function isInputTypeCode(value: string): value is InputTypeCodeOption {
  return (INPUT_TYPE_CODES as readonly string[]).includes(value)
}
