export type Material = {
  id: string
  name: string
  unitCode: string
  sku?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type StockMovement = {
  id: string
  materialId: string
  projectId?: string
  quantity: number
  direction: 'in' | 'out'
  note?: string
  createdAt: string
}
