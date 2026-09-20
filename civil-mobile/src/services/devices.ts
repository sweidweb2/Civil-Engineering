import { apiRequest } from './api'

export type DevicePlatform = 'IOS' | 'ANDROID' | 'UNKNOWN'

export type RegisterDeviceResponse = {
  id: string
  token: string
  platform: DevicePlatform
  updatedAt: string
}

export function registerDevice(
  accessToken: string,
  input: { token: string; platform?: DevicePlatform },
) {
  return apiRequest<RegisterDeviceResponse>('/devices', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  })
}

export function unregisterDevice(accessToken: string, token: string) {
  return apiRequest<void>('/devices', {
    method: 'DELETE',
    accessToken,
    body: JSON.stringify({ token }),
  })
}
