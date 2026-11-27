import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const categoryKindSchema = z.enum(['MATERIAL', 'EQUIPMENT', 'SERVICE', 'WORKER'])

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(80).optional(),
)

const parentIdField = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().min(1).nullable().optional(),
)

/** Empty string clears the Arabic name; whitespace-only becomes null. */
function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

const nameArField = z.preprocess(blankToNull, z.string().max(80).nullable().optional())

export const categoryIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

/** Comma-separated or repeated `kinds` → one DB `IN` filter (directory / listings grids). */
const categoryKindsQuerySchema = z.preprocess((value) => {
  if (value == null || value === '') return undefined
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  }
  return value
}, z.array(categoryKindSchema).min(1).max(4).optional())

/**
 * Accepts legacy `kind=` or `kinds=` (comma / repeated). Output always uses `kinds`
 * only — `kind` is folded in so callers never see both.
 */
export const listCategoriesQuerySchema = paginationQuerySchema
  .extend({
    q: optionalQueryText,
    kind: categoryKindSchema.optional(),
    kinds: categoryKindsQuerySchema,
    /** When false, skip per-row children/listings counts (pickers). Default true. */
    includeCounts: z.preprocess((value) => {
      if (value === 'false' || value === '0' || value === false) return false
      if (value === 'true' || value === '1' || value === true) return true
      return value
    }, z.boolean().optional()),
  })
  .transform((value) => {
    const kinds =
      value.kinds && value.kinds.length > 0 ? value.kinds : value.kind ? [value.kind] : undefined
    return {
      page: value.page,
      limit: value.limit,
      q: value.q,
      kinds,
      includeCounts: value.includeCounts,
    }
  })

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameAr: nameArField,
  kind: categoryKindSchema,
  parentId: parentIdField,
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
})

export const updateCategoryBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    nameAr: nameArField,
    kind: categoryKindSchema.optional(),
    parentId: parentIdField,
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export type CategoryKind = z.infer<typeof categoryKindSchema>

/** Normalized list query (`kind` already folded into `kinds` by the Zod schema). */
export type ListCategoriesQuery = {
  page: number
  limit: number
  q?: string
  kinds?: CategoryKind[]
  includeCounts?: boolean
}

/** Service / test input may still pass legacy `kind`; normalize with `resolveCategoryKinds`. */
export type ListCategoriesQueryInput = ListCategoriesQuery & { kind?: CategoryKind }

/** `kinds` wins when both are set; otherwise a single `kind` becomes a one-element list. */
export function resolveCategoryKinds(query: {
  kind?: CategoryKind
  kinds?: CategoryKind[]
}): CategoryKind[] | undefined {
  if (query.kinds && query.kinds.length > 0) return query.kinds
  if (query.kind) return [query.kind]
  return undefined
}

export type CreateCategoryBody = {
  name: string
  nameAr?: string | null
  kind: CategoryKind
  parentId?: string | null
  isActive?: boolean
  sortOrder?: number
}

export type UpdateCategoryBody = {
  name?: string
  nameAr?: string | null
  kind?: CategoryKind
  parentId?: string | null
  isActive?: boolean
  sortOrder?: number
}
