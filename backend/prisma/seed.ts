/**
 * Local/dev seed — example SUPER + ADMIN accounts.
 * Passwords are intentional placeholders for local use only — never use in production.
 */
import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

import { PrismaClient, type Role } from '../src/generated/prisma/client.js'

const BCRYPT_ROUNDS = 12

const SEED_USERS: Array<{
  email: string
  password: string
  role: Role
  firstName: string
  lastName: string
}> = [
  {
    email: 'super@example.com',
    password: 'password',
    role: 'SUPER',
    firstName: 'Super',
    lastName: 'User',
  },
  {
    email: 'admin@example.com',
    password: 'password',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'User',
  },
]

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed')
  }

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    for (const seed of SEED_USERS) {
      const passwordHash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS)
      const displayName = `${seed.firstName} ${seed.lastName}`

      const user = await prisma.user.upsert({
        where: { email: seed.email },
        create: {
          email: seed.email,
          passwordHash,
          role: seed.role,
          status: 'ACTIVE',
          profile: {
            create: {
              firstName: seed.firstName,
              lastName: seed.lastName,
              displayName,
            },
          },
        },
        update: {
          passwordHash,
          role: seed.role,
          status: 'ACTIVE',
          profile: {
            upsert: {
              create: {
                firstName: seed.firstName,
                lastName: seed.lastName,
                displayName,
              },
              update: {
                firstName: seed.firstName,
                lastName: seed.lastName,
                displayName,
              },
            },
          },
        },
      })

      console.info(`[prisma seed] upserted ${user.role} ${user.email}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
