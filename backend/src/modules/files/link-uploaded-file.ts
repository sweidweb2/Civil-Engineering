import type { AuthActor } from '../../authz/index.js'
import { getRequestLogger } from '../../logging/index.js'
import type { FilesService } from './files.service.js'

type SoftDeleteFiles = Pick<FilesService, 'softDelete'>

/**
 * Run a DB "link" write after `uploadBytes`. If the link fails, soft-delete the
 * READY file so it is not orphaned (PENDING/DELETED sweeper would miss READY rows).
 */
export async function linkUploadedFile<T>(options: {
  actor: AuthActor
  filesService: SoftDeleteFiles
  fileId: string
  kind: string
  link: () => Promise<T>
}): Promise<T> {
  try {
    return await options.link()
  } catch (error) {
    try {
      await options.filesService.softDelete(options.actor, options.fileId)
    } catch (cleanupError) {
      getRequestLogger().warn(
        {
          err: cleanupError,
          fileId: options.fileId,
          kind: `${options.kind}_orphan_cleanup_failed`,
        },
        'failed to soft-delete orphaned upload after link failure',
      )
    }
    throw error
  }
}
