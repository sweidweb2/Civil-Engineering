import { getPool } from './pool.js'

/**
 * Run `fn` only if this process can take a Postgres session advisory lock.
 * Returns `undefined` when another instance already holds the lock.
 * Used so inline purge jobs do not stampede across multiple API processes
 * (no Redis — Postgres is the coordination point).
 */
export async function withAdvisoryLock<T>(
  lockKey: number,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const locked = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [lockKey],
    )
    if (!locked.rows[0]?.locked) {
      return undefined
    }
    try {
      return await fn()
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch(() => undefined)
    }
  } finally {
    client.release()
  }
}
