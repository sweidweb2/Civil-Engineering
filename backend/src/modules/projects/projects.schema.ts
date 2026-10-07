import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const projectIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Project ID is required'),
})

export const listProjectsQuerySchema = paginationQuerySchema

// Minimal create - just essential info
export const createProjectBodySchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be at most 200 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional().or(z.literal('')),
  code: z.string().trim().max(50, 'Project code must be at most 50 characters').optional().or(z.literal('')),
  type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'RENOVATION', 'OTHER']).optional(),
})

// Update allows all fields
export const updateProjectBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200, 'Project name must be at most 200 characters').optional(),
    description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional().or(z.literal('')),
    code: z.string().trim().max(50, 'Project code must be at most 50 characters').optional().or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    country: z.string().trim().max(100).optional().or(z.literal('')),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    actualStartDate: z.string().datetime().optional(),
    actualEndDate: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    budget: z.string().optional(),
    currency: z.string().min(3).max(3).optional(),
    actualCost: z.string().optional(),
    type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'RENOVATION', 'OTHER']).optional(),
    isPublic: z.boolean().optional(),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
