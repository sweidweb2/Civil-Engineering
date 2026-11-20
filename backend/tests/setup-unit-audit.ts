import { afterEach, beforeEach } from 'vitest'

import { setAuditActivitySinkForTests } from '../src/modules/logging/audit.js'

/** Unit suites have no Prisma — keep auditActivity from opening a pool. */
beforeEach(() => {
  setAuditActivitySinkForTests(() => undefined)
})

afterEach(() => {
  setAuditActivitySinkForTests(null)
})
