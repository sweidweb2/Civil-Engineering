import { createMaterialsController } from './materials.controller.js'
import { createMaterialsRepository } from './materials.repository.js'
import { createMaterialsRoutes } from './materials.routes.js'
import { createMaterialsService } from './materials.service.js'

export function createMaterialsModule() {
  const repository = createMaterialsRepository()
  const service = createMaterialsService(repository)
  const controller = createMaterialsController(service)
  return createMaterialsRoutes(controller)
}

export { materialsDomain } from './materials.domain.js'
