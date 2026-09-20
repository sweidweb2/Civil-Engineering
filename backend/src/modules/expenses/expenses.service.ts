import { notFound, notImplemented } from '../../errors/app-error.js'
import type { ExpensesRepository } from './expenses.repository.js'
import type { CreateExpenseBody, UpdateExpenseBody } from './expenses.schema.js'
import type { Expense } from './expenses.types.js'

export type ExpensesService = {
  listExpenses: (projectId?: string) => Promise<Expense[]>
  getExpenseById: (id: string) => Promise<Expense>
  createExpense: (input: CreateExpenseBody, createdBy: string) => Promise<Expense>
  updateExpense: (id: string, input: UpdateExpenseBody) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
}

export function createExpensesService(
  repository: ExpensesRepository
): ExpensesService {
  return {
    async listExpenses(projectId) {
      return repository.findMany(projectId)
    },
    async getExpenseById(id) {
      const expense = await repository.findById(id)
      if (!expense) {
        throw notFound('Expense not found', 'EXPENSE_NOT_FOUND')
      }
      return expense
    },
    async createExpense() {
      throw notImplemented('expenses.createExpense')
    },
    async updateExpense() {
      throw notImplemented('expenses.updateExpense')
    },
    async deleteExpense() {
      throw notImplemented('expenses.deleteExpense')
    },
  }
}
