import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin } from '../../authz/index.js'
import { forbidden, notImplemented } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/projects.service.js'
import type { FileEntityTypeName } from './files.schema.js'

/**
 * Entity attachment authz — ownership/role on the entity, not possession of the key.
 */
export async function assertCanAttachToEntity(
  actor: AuthActor,
  entityType: FileEntityTypeName,
  entityId: string,
  projectsService: ProjectsService,
): Promise<void> {
  switch (entityType) {
    case 'USER':
      assertSelfOrAdmin(actor, entityId)
      return
    case 'PROJECT':
      await projectsService.assertAccessible(entityId, actor)
      return
    case 'EXPENSE':
    case 'MATERIAL':
    case 'WORKER':
    case 'LISTING':
      throw notImplemented(`files.entityAuthz.${entityType}`)
    default:
      throw forbidden('Unknown file entity type')
  }
}

export function assertCanCompleteUpload(actor: AuthActor, uploadedById: string): void {
  if (isAdmin(actor.roles)) {
    return
  }
  if (actor.id !== uploadedById) {
    throw forbidden('Only the uploader can complete this upload')
  }
}
