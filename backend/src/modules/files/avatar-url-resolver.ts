import type { AppConfig } from '../../config/index.js'
import { prisma } from '../../database/prisma.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import type { AvatarUrlResolver } from './avatar-urls.js'

/** One `files` query for READY avatars, then sign each key (failures are skipped). */
export function createAvatarUrlResolver(
  config: AppConfig,
  storage: StorageService,
): AvatarUrlResolver {
  return async (fileIds) => {
    if (fileIds.length === 0) return new Map()
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds }, status: 'READY' },
      select: { id: true, key: true },
    })
    const entries = await Promise.all(
      files.map(async (file) => {
        try {
          const url = await resolvePublicOrPresignedUrl({ config, storage, storagePath: file.key })
          return [file.id, url] as const
        } catch {
          return null
        }
      }),
    )
    return new Map(entries.filter((entry): entry is readonly [string, string] => entry !== null))
  }
}
