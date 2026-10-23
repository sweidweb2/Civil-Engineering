import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { INPUT_TYPE_CODES } from './input-type-codes.js'

export const inputTypeStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(80).optional(),
)

const codeSchema = z.enum(INPUT_TYPE_CODES)

export const inputTypeIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
})

const booleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return value
}, z.boolean().optional())

export const listInputTypesQuerySchema = paginationQuerySchema.extend({
  q: optionalQueryText,
  status: inputTypeStatusSchema.optional(),
  /** When true, include usage counts (admin). Pickers omit this for a leaner query. */
  includeUsage: booleanQuery,
})

export const createInputTypeBodySchema = z.object({
  code: codeSchema,
  label: z.string().trim().min(1).max(80),
  status: inputTypeStatusSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
})

/** When a type is in use, only status (and sortOrder) may change — not code/label. */
export const updateInputTypeBodySchema = z
  .object({
    code: codeSchema.optional(),
    label: z.string().trim().min(1).max(80).optional(),
    status: inputTypeStatusSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export type InputTypeStatus = z.infer<typeof inputTypeStatusSchema>

export type ListInputTypesQuery = {
  page: number
  limit: number
  q?: string
  status?: InputTypeStatus
  includeUsage?: boolean
}

export type CreateInputTypeBody = {
  code: string
  label: string
  status?: InputTypeStatus
  sortOrder?: number
}

export type UpdateInputTypeBody = {
  code?: string
  label?: string
  status?: InputTypeStatus
  sortOrder?: number
}
