import { prisma } from '../../database/prisma.js'
import type { DevicePlatform } from './devices.schema.js'
import type { DeviceTokenRecord } from './devices.types.js'

export type DevicesRepository = {
  upsertToken: (input: {
    userId: string
    token: string
    platform: DevicePlatform
  }) => Promise<DeviceTokenRecord>
  deleteByUserAndToken: (userId: string, token: string) => Promise<boolean>
  findTokensByUserId: (userId: string) => Promise<DeviceTokenRecord[]>
  deleteByTokens: (tokens: string[]) => Promise<number>
}

export function createDevicesRepository(): DevicesRepository {
  return {
    async upsertToken(input) {
      return prisma.deviceToken.upsert({
        where: { token: input.token },
        create: {
          userId: input.userId,
          token: input.token,
          platform: input.platform,
        },
        update: {
          userId: input.userId,
          platform: input.platform,
        },
      })
    },

    async deleteByUserAndToken(userId, token) {
      const result = await prisma.deviceToken.deleteMany({
        where: { userId, token },
      })
      return result.count > 0
    },

    async findTokensByUserId(userId) {
      return prisma.deviceToken.findMany({
        where: { userId },
      })
    },

    async deleteByTokens(tokens) {
      if (tokens.length === 0) {
        return 0
      }
      const result = await prisma.deviceToken.deleteMany({
        where: { token: { in: tokens } },
      })
      return result.count
    },
  }
}
