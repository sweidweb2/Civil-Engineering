import { z } from 'zod'

import { resourceIdSchema } from '../../schemas/index.js'

export const projectIdParamsSchema = z.object({
  projectId: resourceIdSchema,
})

/** Hours worked: 0–24 inclusive, at most one digit after the decimal. */
const HOURS_PATTERN = /^(?:24(?:\.0)?|(?:\d|[1]\d|2[0-3])(?:\.\d)?)$/

export const upsertProductivityHoursBodySchema = z.object({
  hours: z.preprocess(
    (value) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : value),
    z
      .string()
      .trim()
      .regex(HOURS_PATTERN, 'Hours must be between 0 and 24 with at most 1 decimal place'),
  ),
  /** Local calendar day `YYYY-MM-DD`. Defaults to UTC today when omitted. */
  date: z.string().date().optional(),
})

export type UpsertProductivityHoursBody = z.infer<typeof upsertProductivityHoursBodySchema>
