import { createExpensesController } from './expenses.controller.js'
import { createExpensesRepository } from './expenses.repository.js'
import { createExpensesRoutes } from './expenses.routes.js'
import { createExpensesService } from './expenses.service.js'

export function createExpensesModule() {
  const repository = createExpensesRepository()
  const service = createExpensesService(repository)
  const controller = createExpensesController(service)
  return createExpensesRoutes(controller)
}

export { expensesDomain } from './expenses.domain.js'
