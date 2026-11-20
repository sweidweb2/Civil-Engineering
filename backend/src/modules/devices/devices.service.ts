import { unauthorized } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { sendExpoPush } from './devices.expo-push.js'
import type { DevicesRepository } from './devices.repository.js'
import type { RegisterDeviceBody, UnregisterDeviceBody } from './devices.schema.js'
import type { DeviceTokenRecord, NotifyUserPayload } from './devices.types.js'

export type DevicesService = {
  register: (userId: string, input: RegisterDeviceBody) => Promise<DeviceTokenRecord>
  unregister: (userId: string, input: UnregisterDeviceBody) => Promise<void>
  /** Best-effort push to all of a user's registered devices. Never throws to callers. */
  notifyUser: (userId: string, payload: NotifyUserPayload) => Promise<void>
}

export function createDevicesService(
  repository: DevicesRepository,
  options: { expoAccessToken?: string } = {},
): DevicesService {
  return {
    async register(userId, input) {
      if (!userId) {
        throw unauthorized()
      }
      return repository.upsertToken({
        userId,
        token: input.token,
        platform: input.platform,
      })
    },

    async unregister(userId, input) {
      if (!userId) {
        throw unauthorized()
      }
      await repository.deleteByUserAndToken(userId, input.token)
    },

    async notifyUser(userId, payload) {
      try {
        const records = await repository.findTokensByUserId(userId)
        if (records.length === 0) {
          return
        }

        const tokens = records.map((r) => r.token)
        const result = await sendExpoPush(tokens, payload, {
          accessToken: options.expoAccessToken,
        })

        if (result.invalidTokens.length > 0) {
          await repository.deleteByTokens(result.invalidTokens)
        }
      } catch (error) {
        getLogger().error({ err: error, userId }, 'devices.notifyUser push failed')
      }
    },
  }
}
