import { apiRequest } from './api'

export type CategoryKind = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER'

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  nameAr: string | null
  slug: string
  parentId: string | null
  parentName?: string | null
  parentNameAr?: string | null
  imagePath?: string | null
  imageUrl?: string | null
  isActive: boolean
  sortOrder: number
  childCount?: number
  listingCount?: number
  createdAt?: string
  updatedAt?: string
}

export type PaginatedCategories = {
  data: Category[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export type CategoryWriteInput = {
  name: string
  nameAr?: string | null
  kind: CategoryKind
  parentId?: string | null
  isActive?: boolean
  sortOrder?: number
}

export const CATEGORY_KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'WORKER', label: 'Worker' },
]

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

export function getCategory(id: string) {
  return apiRequest<{ data: Category }>(`/categories/${id}`)
}

/**
 * Top-level categories of one kind, i.e. valid parents (backend: same kind,
 * platform scope, two levels max). Pages through the API's 100-row cap.
 */
export async function listParentCandidates(kind: CategoryKind) {
  const out: Category[] = []
  for (let page = 1; page <= 20; page += 1) {
    const r = await listCategories(page, 100, { kind, includeCounts: false })
    out.push(...r.data.filter((c) => !c.parentId))
    if (page * 100 >= r.meta.total || r.data.length === 0) break
  }
  return out
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

export function isListingCategory(category: Category) {
  return (
    category.kind === 'MATERIAL' || category.kind === 'EQUIPMENT' || category.kind === 'SERVICE'
  )
}
