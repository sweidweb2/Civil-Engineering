import { createInputTypesController } from './input-types.controller.js'
import { createInputTypesRepository } from './input-types.repository.js'
import { createInputTypesRoutes } from './input-types.routes.js'
import { createInputTypesService } from './input-types.service.js'

export function createInputTypesModule() {
  const repository = createInputTypesRepository()
  const service = createInputTypesService(repository)
  const controller = createInputTypesController(service)
  return createInputTypesRoutes(controller)
}

export { INPUT_TYPE_CODE_OPTIONS, INPUT_TYPE_CODES } from './input-type-codes.js'
