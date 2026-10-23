import { z } from 'zod'

export const projectStepperParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
})

export const projectStepperIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  stepperProjectId: z.string().trim().min(1).max(64),
})

export const projectStepInputIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  stepperProjectId: z.string().trim().min(1).max(64),
  inputId: z.string().trim().min(1).max(64),
})

/** Flexible JSON scalar for TEXT / NUMBER / YES_NO / DATE (ISO string). */
export const stepperInputValueSchema = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
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
  value: stepperInputValueSchema.optional(),
})

export type StepperInputValuePayload = z.infer<typeof stepperInputValueSchema>
export type UpsertStepperValuesBody = z.infer<typeof upsertStepperValuesBodySchema>
export type CreateProjectStepInputBody = z.infer<typeof createProjectStepInputBodySchema>
