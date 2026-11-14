import type { AppConfig } from '../config/index.js'
import { loadConfig, requireStorageConfig } from '../config/index.js'
import { createStorageService, type StorageService } from './storage.service.js'

export { buildObjectKey, sanitizeOriginalName, storageEnvSegment } from './object-key.js'
export type { HeadObjectResult, StorageService } from './storage.service.js'
export { createStorageService } from './storage.service.js'

let storageSingleton: StorageService | null = null

export function getStorageService(config: AppConfig = loadConfig()): StorageService {
  if (!storageSingleton) {
    storageSingleton = createStorageService(requireStorageConfig(config))
  }
  return storageSingleton
}

/** Test / DI hook — reset or inject a mock. */
export function setStorageServiceForTests(service: StorageService | null): void {
  storageSingleton = service
}
