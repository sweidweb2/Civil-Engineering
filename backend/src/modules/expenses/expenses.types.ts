export type ExpenseCategory = 'labor' | 'materials' | 'equipment' | 'other'

export type Expense = {
  id: string
  projectId: string
  createdBy: string
  category: ExpenseCategory
  amount: number
  currency: string
  note?: string
  materialId?: string
  incurredAt: string
  createdAt: string
  updatedAt: string
}
