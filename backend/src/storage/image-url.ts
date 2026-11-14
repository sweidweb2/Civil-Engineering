import type { AppConfig } from '../config/index.js'
import type { StorageService } from './storage.service.js'

/**
 * Resolve a browser-loadable URL for a stored object key.
 * Prefers the public base URL (no per-row signing) when configured; otherwise presigns a GET.
 * Presign failures propagate — callers decide whether to swallow them.
 */
export async function resolvePublicOrPresignedUrl(opts: {
  config: AppConfig
  storage: StorageService
  storagePath: string
}): Promise<string> {
  const { config, storage, storagePath } = opts
  const publicBase = config.storage?.publicBaseUrl?.replace(/\/$/, '')
  if (publicBase) {
    return `${publicBase}/${storagePath.replace(/^\//, '')}`
  }
  const expiresInSec = config.storage?.downloadUrlTtlSec ?? config.storageDownloadUrlTtlSec
  return storage.presignGet({ key: storagePath, expiresInSec })
}
