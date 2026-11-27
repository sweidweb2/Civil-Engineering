import { Prisma } from '../generated/prisma/client.js'

/** True for Prisma foreign-key / relation constraint failures (e.g. onDelete: Restrict). */
export function isForeignKeyConflictError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2003' || error.code === 'P2014')
  )
}
