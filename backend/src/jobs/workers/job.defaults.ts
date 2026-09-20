/**
 * Shared BullMQ job defaults — locked in Docs/[3] Decisions/[8] Redis.md.
 * Import these when the first durable worker is wired; do not invent per-job
 * retry policy unless a use case documents a deliberate override.
 */

/** Max attempts including the first run (5 = 1 try + 4 retries). */
export const JOB_ATTEMPTS = 5

/** Initial backoff delay (ms); doubles each retry (2s → 4s → 8s → 16s). */
export const JOB_BACKOFF_DELAY_MS = 2_000

export const JOB_BACKOFF = {
  type: 'exponential' as const,
  delay: JOB_BACKOFF_DELAY_MS,
}

/** Keep recent completed jobs for short debugging; trim by count. */
export const JOB_REMOVE_ON_COMPLETE = { count: 1_000 } as const

/**
 * Keep failed jobs for inspection / manual redrive.
 * Never auto-discard permanently failed side-effect jobs.
 */
export const JOB_REMOVE_ON_FAIL = false as const

/**
 * Default `defaultJobOptions` for BullMQ Queue constructors.
 * Workers must log when a job exhausts attempts (see Redis.md).
 */
export const defaultJobOptions = {
  attempts: JOB_ATTEMPTS,
  backoff: JOB_BACKOFF,
  removeOnComplete: JOB_REMOVE_ON_COMPLETE,
  removeOnFail: JOB_REMOVE_ON_FAIL,
} as const
