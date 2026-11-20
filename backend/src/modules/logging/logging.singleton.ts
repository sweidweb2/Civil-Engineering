import { createLoggingRepository } from './logging.repository.js'
import { createLoggingService, type LoggingService } from './logging.service.js'

let sharedService: LoggingService | null = null

export function getLoggingService(): LoggingService {
  if (!sharedService) {
    sharedService = createLoggingService(createLoggingRepository())
  }
  return sharedService
}

/** Test helper — drop the singleton between suites if needed. */
export function resetLoggingServiceForTests(): void {
  sharedService = null
}
