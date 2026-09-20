import type { CreateExpenseBody, UpdateExpenseBody } from './expenses.schema.js'
import type { Expense } from './expenses.types.js'

export type ExpensesRepository = {
  findMany: (projectId?: string) => Promise<Expense[]>
  findById: (id: string) => Promise<Expense | null>
  create: (input: CreateExpenseBody & { createdBy: string }) => Promise<Expense>
  update: (id: string, input: UpdateExpenseBody) => Promise<Expense>
  delete: (id: string) => Promise<void>
}

export function createExpensesRepository(): ExpensesRepository {
  return {
    async findMany() {
      return []
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('expenses.repository.create requires Prisma')
    },
    async update() {
      throw new Error('expenses.repository.update requires Prisma')
    },
    async delete() {
      throw new Error('expenses.repository.delete requires Prisma')
    },
  }
}
