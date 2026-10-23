import { getFilesService } from '../files/index.js'
import { createUsersController } from './users.controller.js'
import { createUsersRepository } from './users.repository.js'
import { createUsersRoutes } from './users.routes.js'
import { createUsersService } from './users.service.js'

export function createUsersModule() {
  const repository = createUsersRepository()
  const service = createUsersService(repository, getFilesService())
  const controller = createUsersController(service)
  return createUsersRoutes(controller)
}

export { usersDomain } from './users.domain.js'
