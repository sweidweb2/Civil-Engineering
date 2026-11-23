import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin } from '../../authz/index.js'
import { prisma } from '../../database/prisma.js'
import { forbidden, notFound } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/index.js'
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
    case 'DESIGN_REQUEST': {
      const request = await prisma.designRequest.findUnique({
        where: { id: entityId },
        select: { requestedById: true },
      })
      if (!request) {
        throw notFound('Design request not found', 'DESIGN_REQUEST_NOT_FOUND')
      }
      if (isAdmin(actor.roles) || actor.id === request.requestedById) {
        return
      }
      throw forbidden('Not allowed to attach files to this design request')
    }
    case 'EXPENSE':
    case 'MATERIAL':
    case 'WORKER':
    case 'LISTING':
      throw forbidden(
        `File attachments for ${entityType} are not supported yet`,
        'FILE_ENTITY_UNSUPPORTED',
      )
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
