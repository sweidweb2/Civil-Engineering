import type { DevicePlatform } from './devices.schema.js'

export type DeviceTokenRecord = {
  id: string
  userId: string
  token: string
  platform: DevicePlatform
  createdAt: Date
  updatedAt: Date
}

export type NotifyUserPayload = {
  title: string
  body: string
  data?: Record<string, string>
}
