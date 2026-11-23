import type { AppConfig } from '../../config/index.js'
import { prisma } from '../../database/prisma.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import { createWorkersController } from './workers.controller.js'
import { createWorkersRepository } from './workers.repository.js'
import { createWorkersRoutes } from './workers.routes.js'
import {
  createWorkersService,
  type AvatarUrlResolver,
  type WorkersService,
} from './workers.service.js'

export type WorkersModuleDeps = {
  config?: AppConfig
  storage?: StorageService
}

/** Avatar File ids → loadable URLs (READY files only; signing failures are skipped). */
function createAvatarUrlResolver(config: AppConfig, storage: StorageService): AvatarUrlResolver {
  return async (fileIds) => {
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

export function createWorkersModule(deps: WorkersModuleDeps = {}) {
  const repository = createWorkersRepository()
  const service = createWorkersService(repository, {
    resolveAvatarUrls:
      deps.config && deps.storage ? createAvatarUrlResolver(deps.config, deps.storage) : undefined,
  })
  const controller = createWorkersController(service)
  return createWorkersRoutes(controller)
}

export { createWorkersService }
export type { WorkersService }
