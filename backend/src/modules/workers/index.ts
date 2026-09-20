import { createWorkersController } from './workers.controller.js'
import { createWorkersRepository } from './workers.repository.js'
import { createWorkersRoutes } from './workers.routes.js'
import { createWorkersService } from './workers.service.js'

export function createWorkersModule() {
  const repository = createWorkersRepository()
  const service = createWorkersService(repository)
  const controller = createWorkersController(service)
  return createWorkersRoutes(controller)
}

export { workersDomain } from './workers.domain.js'
