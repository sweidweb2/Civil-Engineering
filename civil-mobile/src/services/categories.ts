import { apiRequest } from './api'

export type CategoryKind = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER'

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  nameAr: string | null
  slug: string
  parentId: string | null
  isActive: boolean
  sortOrder: number
}

export type PaginatedCategories = {
  data: Category[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export function listCategories(
  page = 1,
  limit = 100,
  filters?: { q?: string; kind?: CategoryKind; includeCounts?: boolean },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.includeCounts === false) params.set('includeCounts', 'false')
  if (filters?.kind) params.set('kind', filters.kind)
  return apiRequest<PaginatedCategories>(`/categories?${params.toString()}`)
}

export function isListingCategory(category: Category) {
  return (
    category.kind === 'MATERIAL' || category.kind === 'EQUIPMENT' || category.kind === 'SERVICE'
  )
}
