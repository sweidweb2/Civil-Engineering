/**
 * BullMQ workers live here when the first durable async job is introduced.
 * Keep API process thin — heavy work runs in a worker entry (or same process initially).
 *
 * Package `bullmq` is not installed yet — sync seams in `jobs/index.ts` stay
 * until a real async job needs the queue (Docs/[3] Decisions/[8] Redis.md).
 *
 * Retry / backoff (locked — see `job.defaults.ts`):
 * - 5 attempts, exponential backoff starting at 2s
 *
 * Failed-job handling (locked):
 * - Permanently failed jobs stay in BullMQ failed set (`removeOnFail: false`)
 * - Log at error with job name, id, idempotencyKey, failure reason
 * - Never silent-drop side effects
 *
 * Monitoring (locked for now):
 * - GET /api/v1/health/redis
 * - Later: BullMQ metrics / board if needed
 */

export {
  JOB_ATTEMPTS,
  JOB_BACKOFF,
  JOB_BACKOFF_DELAY_MS,
  JOB_REMOVE_ON_COMPLETE,
  JOB_REMOVE_ON_FAIL,
  defaultJobOptions,
} from './job.defaults.js'
