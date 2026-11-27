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

export const LISTING_CATEGORY_KINDS: CategoryKind[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE']

export function listCategories(
  page = 1,
  limit = 100,
  filters?: {
    q?: string
    kind?: CategoryKind
    /** One round-trip for several kinds (`kinds=MATERIAL,EQUIPMENT,SERVICE`). */
    kinds?: CategoryKind[]
    includeCounts?: boolean
  },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.includeCounts === false) params.set('includeCounts', 'false')
  if (filters?.kinds?.length) params.set('kinds', filters.kinds.join(','))
  else if (filters?.kind) params.set('kind', filters.kind)
  return apiRequest<PaginatedCategories>(`/categories?${params.toString()}`)
}

export function getCategory(id: string) {
  return apiRequest<{ data: Category }>(`/categories/${id}`)
}

/**
 * Fetch pages 2…N in parallel. Fulfilled pages are kept; a single failed page
 * does not discard earlier data (`allSettled`).
 */
async function appendCategoryPages(
  out: Category[],
  filters: {
    q?: string
    kind?: CategoryKind
    kinds?: CategoryKind[]
    includeCounts?: boolean
  },
  totalPages: number,
  pick: (cat: Category) => boolean,
) {
  if (totalPages <= 1) return out
  const rest = await Promise.allSettled(
    Array.from({ length: totalPages - 1 }, (_, i) => listCategories(i + 2, 100, filters)),
  )
  for (const page of rest) {
    if (page.status === 'fulfilled') out.push(...page.value.data.filter(pick))
  }
  return out
}

/**
 * Top-level categories of one kind, i.e. valid parents (backend: same kind,
 * platform scope, two levels max). Pages through the API's 100-row cap;
 * remaining pages after the first load in parallel (partial success OK).
 */
export async function listParentCandidates(kind: CategoryKind) {
  const filters = { kind, includeCounts: false as const }
  const first = await listCategories(1, 100, filters)
  const out = first.data.filter((c) => !c.parentId)
  const totalPages = Math.min(20, Math.max(1, Math.ceil(first.meta.total / 100)))
  if (first.data.length === 0) return out
  return appendCategoryPages(out, filters, totalPages, (c) => !c.parentId)
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

function isActiveListingCategory(cat: Category) {
  return isListingCategory(cat) && cat.isActive && (cat.listingCount ?? 0) > 0
}

/**
 * Active marketplace categories that have at least one listing.
 * One `kinds=` filter; first page then remaining pages in parallel (cap 20,
 * same ceiling as `listParentCandidates`). Later-page failures keep page-1
 * results instead of failing the whole load.
 */
export async function listActiveListingCategories(q?: string) {
  const filters = {
    kinds: LISTING_CATEGORY_KINDS,
    q: q || undefined,
    includeCounts: true as const,
  }
  const first = await listCategories(1, 100, filters)
  const out = first.data.filter(isActiveListingCategory)
  const totalPages = Math.min(20, Math.max(1, Math.ceil(first.meta.total / 100)))
  if (first.data.length > 0) {
    await appendCategoryPages(out, filters, totalPages, isActiveListingCategory)
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}
