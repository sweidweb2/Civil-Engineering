import { z } from 'zod'

export const devicePlatformSchema = z.enum(['IOS', 'ANDROID', 'UNKNOWN'])

export const registerDeviceBodySchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: devicePlatformSchema.optional().default('UNKNOWN'),
})

export const unregisterDeviceBodySchema = z.object({
  token: z.string().trim().min(1).max(512),
})

export type RegisterDeviceBody = z.infer<typeof registerDeviceBodySchema>
export type UnregisterDeviceBody = z.infer<typeof unregisterDeviceBodySchema>
export type DevicePlatform = z.infer<typeof devicePlatformSchema>
