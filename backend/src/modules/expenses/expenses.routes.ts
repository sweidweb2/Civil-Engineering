import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { ExpensesController } from './expenses.controller.js'
import {
  createExpenseBodySchema,
  expenseIdParamsSchema,
  listExpensesQuerySchema,
  updateExpenseBodySchema,
} from './expenses.schema.js'

export function createExpensesRoutes(controller: ExpensesController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listExpensesQuerySchema }), controller.list)
  router.get('/:id', validate({ params: expenseIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createExpenseBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: expenseIdParamsSchema, body: updateExpenseBodySchema }),
    controller.update,
  )
  router.delete('/:id', validate({ params: expenseIdParamsSchema }), controller.remove)

  return router
}
