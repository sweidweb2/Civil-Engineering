/**
 * Shared retry defaults if/when a durable job runner is introduced.
 * Keep sync seams in `jobs/index.ts` until then.
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

/** Keep failed jobs for inspection / manual redrive. */
export const JOB_REMOVE_ON_FAIL = false as const

export const defaultJobOptions = {
  attempts: JOB_ATTEMPTS,
  backoff: JOB_BACKOFF,
  removeOnComplete: JOB_REMOVE_ON_COMPLETE,
  removeOnFail: JOB_REMOVE_ON_FAIL,
} as const
