import { createStepsController } from './steps.controller.js'
import { createStepsRepository } from './steps.repository.js'
import { createStepsRoutes } from './steps.routes.js'
import { createStepsService, type StepsService } from './steps.service.js'

let stepsServiceSingleton: StepsService | null = null

export function getStepsService(): StepsService {
  if (!stepsServiceSingleton) {
    const repository = createStepsRepository()
    stepsServiceSingleton = createStepsService(repository)
  }
  return stepsServiceSingleton
}

export function createStepsModule() {
  const service = getStepsService()
  const controller = createStepsController(service)
  return createStepsRoutes(controller)
}

export { createStepsService }
export type { StepsService }
