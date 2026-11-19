import { z } from 'zod'

import { passwordSchema } from './password.schema'

export const registerRoleSchema = z.enum(['CLIENT', 'WORKER', 'MANAGER'])

export const registerSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: passwordSchema,
  role: registerRoleSchema,
})

export type RegisterValues = z.infer<typeof registerSchema>
