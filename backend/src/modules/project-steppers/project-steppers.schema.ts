import { z } from 'zod'

export const projectStepperParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
})

/** Path params for a project step instance (`:projectStepId` = StepperProject.id). */
export const projectStepperIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  projectStepId: z.string().trim().min(1).max(64),
})

export const projectStepInputIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  projectStepId: z.string().trim().min(1).max(64),
  inputId: z.string().trim().min(1).max(64),
})

/** Immutable listing snapshot stored for CATEGORY fields. */
export const listingSnapshotSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string(),
  type: z.string(),
  categoryId: z.string(),
  brand: z.string().nullable(),
  unit: z.string(),
  currency: z.string(),
  price: z.string(),
  rentalPrice: z.string().nullable(),
  rentalUnit: z.string().nullable(),
  providerId: z.string(),
  status: z.string(),
  description: z.string().nullable(),
})

/** Immutable file snapshot stored for FILE fields. */
export const fileSnapshotSchema = z.object({
  id: z.string().trim().min(1).max(64),
  originalName: z.string(),
  mime: z.string(),
  size: z.number().int().nullable(),
})

/**
 * Write/read value union:
 * - scalars for TEXT / NUMBER / YES_NO / DATE
 * - listing id string (write) or listing snapshot (read/re-save) for CATEGORY
 * - file id string (write) or file snapshot (read/re-save) for FILE
 */
export const stepperInputValueSchema = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
  listingSnapshotSchema,
  fileSnapshotSchema,
  z.null(),
])

export const upsertStepperValuesBodySchema = z.object({
  values: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(64),
        value: stepperInputValueSchema,
      }),
    )
    .max(200),
})

export const createProjectStepInputBodySchema = z.object({
  inputTypeId: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  orderNb: z.coerce.number().int().min(0).max(10000).optional(),
  categoryId: z.string().trim().min(1).max(64).nullable().optional(),
  value: stepperInputValueSchema.optional(),
})

export const updateProjectStepInputBodySchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    categoryId: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export type ListingSnapshotPayload = z.infer<typeof listingSnapshotSchema>
export type FileSnapshotPayload = z.infer<typeof fileSnapshotSchema>
export type StepperInputValuePayload = z.infer<typeof stepperInputValueSchema>
export type UpsertStepperValuesBody = z.infer<typeof upsertStepperValuesBodySchema>
export type CreateProjectStepInputBody = z.infer<typeof createProjectStepInputBodySchema>
export type UpdateProjectStepInputBody = z.infer<typeof updateProjectStepInputBodySchema>
