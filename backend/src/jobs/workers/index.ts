/**
 * BullMQ workers live here when the first durable async job is introduced.
 * Keep API process thin — heavy work runs in a worker entry (or same process initially).
 *
 * Failed-job handling (locked):
 * - Bounded retries + exponential backoff
 * - Permanently failed jobs stay in BullMQ failed set / are logged
 * - Never silent-drop side effects
 *
 * Monitoring (locked for now):
 * - GET /api/v1/health/redis
 * - Later: BullMQ metrics / board if needed
 */

export {}
