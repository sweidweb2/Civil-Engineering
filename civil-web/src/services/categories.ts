import { apiRequest } from './api'

export type CategoryKind = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER'

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  slug: string
  parentId: string | null
  parentName: string | null
  isActive: boolean
  sortOrder: number
  childCount: number
  listingCount: number
  createdAt: string
  updatedAt: string
}

export type CategoryKindCounts = {
  MATERIAL: number
  EQUIPMENT: number
  SERVICE: number
  WORKER: number
}

export type PaginatedCategories = {
  data: Category[]
  meta: {
    page: number
    limit: number
    total: number
    kindCounts: CategoryKindCounts
  }
}

export type CategoryWriteInput = {
  name: string
  kind: CategoryKind
  parentId?: string | null
  isActive?: boolean
  sortOrder?: number
}

export const CATEGORY_KINDS: CategoryKind[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE', 'WORKER']

export function isCategoryKind(value: string): value is CategoryKind {
  return value === 'MATERIAL' || value === 'EQUIPMENT' || value === 'SERVICE' || value === 'WORKER'
}

export function categoryKindLabel(kind: CategoryKind): string {
  if (kind === 'MATERIAL') return 'Material'
  if (kind === 'EQUIPMENT') return 'Equipment'
  if (kind === 'SERVICE') return 'Service'
  return 'Worker'
}

export function listCategories(
  page = 1,
  limit = 8,
  filters?: { q?: string; kind?: CategoryKind; includeCounts?: boolean },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.includeCounts === false) params.set('includeCounts', 'false')
  if (filters?.kind) params.set('kind', filters.kind)
  return apiRequest<PaginatedCategories>(`/categories?${params.toString()}`)
}

export function createCategory(input: CategoryWriteInput) {
  return apiRequest<{ data: Category }>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateCategory(id: string, input: Partial<CategoryWriteInput>) {
  return apiRequest<{ data: Category }>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteCategory(id: string) {
  return apiRequest<void>(`/categories/${id}`, { method: 'DELETE' })
}
