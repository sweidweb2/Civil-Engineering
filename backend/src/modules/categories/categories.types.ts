import type { CategoryKind } from './categories.schema.js'

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  nameAr: string | null
  slug: string
  parentId: string | null
  parentName: string | null
  parentNameAr: string | null
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
