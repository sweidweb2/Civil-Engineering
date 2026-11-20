import { getRequestStore } from '../../logging/request-als.js'
import type { CreateActivityInput } from './logging.repository.js'
import { getLoggingService } from './logging.singleton.js'

type AuditInput = {
  action: string
  entity?: string | null
  entityId?: string | null
  userId?: string | null
  meta?: CreateActivityInput['meta']
}

type AuditSink = (input: CreateActivityInput) => void

const defaultSink: AuditSink = (input) => {
  getLoggingService().recordActivitySafe(input)
}

let sink: AuditSink = defaultSink

/** Test helper — swap the activity sink (e.g. noop) without opening Prisma. */
export function setAuditActivitySinkForTests(next: AuditSink | null): void {
  sink = next ?? defaultSink
}

/**
 * Fire-and-forget activity row with requestId/ip from AsyncLocalStorage.
 * Never throws; use after successful privileged mutations.
 */
export function auditActivity(input: AuditInput): void {
  const store = getRequestStore()
  sink({
    userId: input.userId ?? store?.userId ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entityId: input.entityId ?? null,
    meta: input.meta,
    ip: store?.ip ?? null,
    requestId: store?.requestId ?? null,
  })
}
