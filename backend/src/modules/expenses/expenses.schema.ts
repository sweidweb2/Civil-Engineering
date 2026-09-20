import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const expenseIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listExpensesQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().min(1).optional(),
})

export const createExpenseBodySchema = z.object({
  projectId: z.string().min(1),
  category: z.enum(['labor', 'materials', 'equipment', 'other']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  note: z.string().max(1000).optional(),
  materialId: z.string().min(1).optional(),
  incurredAt: z.string().datetime().optional(),
})

export const updateExpenseBodySchema = z
  .object({
    category: z.enum(['labor', 'materials', 'equipment', 'other']).optional(),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    note: z.string().max(1000).optional(),
    materialId: z.string().min(1).nullable().optional(),
    incurredAt: z.string().datetime().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>
export type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>
