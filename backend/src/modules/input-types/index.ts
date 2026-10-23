import { createInputTypesController } from './input-types.controller.js'
import { createInputTypesRepository } from './input-types.repository.js'
import { createInputTypesRoutes } from './input-types.routes.js'
import { createInputTypesService, type InputTypesService } from './input-types.service.js'

let inputTypesServiceSingleton: InputTypesService | null = null

/** Shared instance for HTTP module wiring and cross-module lookups. */
export function getInputTypesService(): InputTypesService {
  if (!inputTypesServiceSingleton) {
    inputTypesServiceSingleton = createInputTypesService(createInputTypesRepository())
  }
  return inputTypesServiceSingleton
}

export function createInputTypesModule() {
  const service = getInputTypesService()
  const controller = createInputTypesController(service)
  return createInputTypesRoutes(controller)
}

export { createInputTypesService }
export type { InputTypesService }
export type { ActiveInputTypeRef } from './input-types.repository.js'
export { INPUT_TYPE_CODE_OPTIONS, INPUT_TYPE_CODES } from './input-type-codes.js'
