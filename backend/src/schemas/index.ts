import { z } from 'zod'

/** Path/id param — cuid or other opaque string ids (not strict UUID). */
export const uuidSchema = z.string().trim().min(1)
