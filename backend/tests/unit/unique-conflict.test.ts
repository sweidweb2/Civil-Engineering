import { describe, expect, it } from 'vitest'

import { translateUniqueConflict } from '../../src/database/unique-conflict.js'
import { UniqueConflictError } from '../../src/errors/app-error.js'
import { Prisma } from '../../src/generated/prisma/client.js'

describe('translateUniqueConflict', () => {
  it('returns the result when the write succeeds', async () => {
    await expect(translateUniqueConflict(async () => 'ok')).resolves.toBe('ok')
  })

  it('maps Prisma P2002 to UniqueConflictError', async () => {
    const run = async () => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
    }
    const error = await translateUniqueConflict(run).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UniqueConflictError)
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('rethrows other Prisma errors unchanged', async () => {
    const original = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: 'test',
    })
    await expect(
      translateUniqueConflict(async () => {
        throw original
      }),
    ).rejects.toBe(original)
  })
})
