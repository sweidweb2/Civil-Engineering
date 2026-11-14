/**
 * Async workers placeholder.
 * Jobs currently run sync via `jobs/index.ts`. Add a real worker process only
 * when durable retries / off-request work are required.
 */

export {
  defaultJobOptions,
  JOB_ATTEMPTS,
  JOB_BACKOFF,
  JOB_BACKOFF_DELAY_MS,
  JOB_REMOVE_ON_COMPLETE,
  JOB_REMOVE_ON_FAIL,
} from './job.defaults.js'
