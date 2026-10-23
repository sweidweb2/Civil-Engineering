import request from 'supertest'
import { expect } from 'vitest'

import { createApp } from '../../src/app.js'
import { getPrisma } from '../../src/database/prisma.js'
import type { RoleName } from '../../src/modules/auth/auth.schema.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'

export const E2E_PASSWORD = 'password1'

export type E2EApp = ReturnType<typeof createApp>

export function createE2EApp() {
  const config = loadTestConfig({
    DATABASE_URL: process.env.DATABASE_URL,
  })
  return createApp({ config })
}

export async function createE2EUser(
  role: RoleName,
  email: string,
  options: { status?: 'ACTIVE' | 'PENDING' | 'INACTIVE'; firstName?: string } = {},
) {
  const prisma = getPrisma()
  const firstName = options.firstName ?? role
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(E2E_PASSWORD),
      role,
      status: options.status ?? 'ACTIVE',
      profile: {
        create: {
          firstName,
          lastName: 'E2E',
          displayName: `${firstName} E2E`,
        },
      },
    },
  })
}

export async function loginE2E(app: E2EApp, email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: E2E_PASSWORD,
  })
  expect(res.status).toBe(200)
  expect(res.body.tokens.accessToken).toBeTruthy()
  return {
    accessToken: res.body.tokens.accessToken as string,
    refreshToken: res.body.tokens.refreshToken as string,
    user: res.body.user as { id: string; email: string; role: RoleName },
  }
}

export function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}
