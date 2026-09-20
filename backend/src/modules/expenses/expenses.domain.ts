import type { DomainDefinition } from '../_shared/domain-definition.js'

export const expensesDomain = {
  name: 'expenses',
  responsibility:
    'Owns project cost entries (amounts, categories, receipts metadata). Money totals and expense rules live here.',
  entities: [
    {
      name: 'Expense',
      description: 'A cost line tied to a project with amount, category, and date.',
    },
  ],
  valueObjects: [
    {
      name: 'Money',
      description: 'Amount + currency code (currency set TBD; default likely local).',
    },
    {
      name: 'ExpenseCategory',
      description: 'labor | materials | equipment | other — exact set TBD.',
    },
  ],
  useCases: ['listExpenses', 'getExpenseById', 'createExpense', 'updateExpense', 'deleteExpense'],
  relationships: [
    'Expense.projectId → Project (projects).',
    'Expense.createdBy → User (users).',
    'Expense.materialId? → Material (materials).',
  ],
  externalAccessRules: [
    'Only expenses module writes expense rows.',
    'Must verify project access via projects public service before mutate/list-by-project.',
    'No deep imports into projects/materials repositories.',
  ],
} as const satisfies DomainDefinition
