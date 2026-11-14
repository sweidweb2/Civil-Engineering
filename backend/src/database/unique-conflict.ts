import { UniqueConflictError } from '../errors/app-error.js'
import { Prisma } from '../generated/prisma/client.js'

const UNIQUE_VIOLATION_CODE = 'P2002'

/**
 * Repository boundary helper: run a write and translate Prisma unique violations
 * (P2002) into a typed `UniqueConflictError`. Other errors pass through untouched.
 */
export async function translateUniqueConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION_CODE
    ) {
      throw new UniqueConflictError()
    }
    throw error
  }
}
