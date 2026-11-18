import { createWorkersController } from './workers.controller.js'
import { createWorkersRepository } from './workers.repository.js'
import { createWorkersRoutes } from './workers.routes.js'
import { createWorkersService, type WorkersService } from './workers.service.js'

export function createWorkersModule() {
  const repository = createWorkersRepository()
  const service = createWorkersService(repository)
  const controller = createWorkersController(service)
  return createWorkersRoutes(controller)
}

export { createWorkersService }
export type { WorkersService }
