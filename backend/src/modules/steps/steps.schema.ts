import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const stepStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(80).optional(),
)

const orderNbField = z.coerce.number().int().min(0).max(10000)

export const stepIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
})

export const stepInputParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  inputId: z.string().trim().min(1).max(64),
})

export const listStepsQuerySchema = paginationQuerySchema.extend({
  q: optionalQueryText,
  status: stepStatusSchema.optional(),
})

export const listStepInputsQuerySchema = paginationQuerySchema

export const createStepBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  orderNb: orderNbField.optional(),
  status: stepStatusSchema.optional(),
})

export const updateStepBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    orderNb: orderNbField.optional(),
    status: stepStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export const createStepInputBodySchema = z.object({
  inputTypeId: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  orderNb: orderNbField.optional(),
  categoryId: z.string().trim().min(1).max(64).nullable().optional(),
})

export const updateStepInputBodySchema = z
  .object({
    inputTypeId: z.string().trim().min(1).max(64).optional(),
    label: z.string().trim().min(1).max(120).optional(),
    orderNb: orderNbField.optional(),
    categoryId: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export type StepStatus = z.infer<typeof stepStatusSchema>

export type ListStepsQuery = {
  page: number
  limit: number
  q?: string
  status?: StepStatus
}

export type ListStepInputsQuery = {
  page: number
  limit: number
}

export type CreateStepBody = {
  name: string
  orderNb?: number
  status?: StepStatus
}

export type UpdateStepBody = {
  name?: string
  orderNb?: number
  status?: StepStatus
}

export type CreateStepInputBody = {
  inputTypeId: string
  label: string
  orderNb?: number
  categoryId?: string | null
}

export type UpdateStepInputBody = {
  inputTypeId?: string
  label?: string
  orderNb?: number
  categoryId?: string | null
}

export type OrderAdjustMeta = {
  orderAdjusted: boolean
  orderNb: number
}
