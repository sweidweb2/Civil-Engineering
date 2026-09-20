import type { NextFunction, Request, Response } from 'express'

import type { ExpensesService } from './expenses.service.js'

export type ExpensesController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createExpensesController(
  service: ExpensesService
): ExpensesController {
  return {
    async list(req, res, next) {
      try {
        const projectId =
          typeof req.query.projectId === 'string'
            ? req.query.projectId
            : undefined
        const data = await service.listExpenses(projectId)
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const expense = await service.getExpenseById(String(req.params.id))
        res.status(200).json(expense)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const createdBy = req.user?.id ?? 'unknown'
        const expense = await service.createExpense(req.body, createdBy)
        res.status(201).json(expense)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const expense = await service.updateExpense(
          String(req.params.id),
          req.body
        )
        res.status(200).json(expense)
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        await service.deleteExpense(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
