import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import {
  conflict,
  forbidden,
  isUniqueConflictError,
  notFound,
  validationError,
} from '../../errors/app-error.js'
import type { CategoriesRepository, CategoryRecord } from './categories.repository.js'
import type {
  CategoryKind,
  CreateCategoryBody,
  ListCategoriesQuery,
  UpdateCategoryBody,
} from './categories.schema.js'
import type { Category, PaginatedCategories } from './categories.types.js'

export type CategoriesService = {
  listCategories: (query: ListCategoriesQuery, actor: AuthActor) => Promise<PaginatedCategories>
  getCategoryById: (id: string, actor: AuthActor) => Promise<Category>
  createCategory: (input: CreateCategoryBody, actor: AuthActor) => Promise<Category>
  updateCategory: (id: string, input: UpdateCategoryBody, actor: AuthActor) => Promise<Category>
  deleteCategory: (id: string, actor: AuthActor) => Promise<void>
  /** Internal lookup for other modules (no actor); throws CATEGORY_NOT_FOUND. */
  requirePlatformCategory: (id: string) => Promise<{ id: string; isActive: boolean }>
}

export function categorySlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'category'
}

export function toCategoryDto(record: CategoryRecord): Category {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    nameAr: record.nameAr,
    slug: record.slug,
    parentId: record.parentId,
    parentName: record.parentName,
    parentNameAr: record.parentNameAr,
    isActive: record.isActive,
    sortOrder: record.sortOrder,
    childCount: record.childCount,
    listingCount: record.listingCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertAdmin(actor: AuthActor) {
  if (!isAdmin(actor.roles)) {
    throw forbidden('Only admins can manage categories')
  }
}

function assertCanView(actor: AuthActor) {
  if (isAdmin(actor.roles) || actor.roles.includes('MANAGER') || actor.roles.includes('PROVIDER')) {
    return
  }
  throw forbidden('Only admins, project managers, and providers can view categories')
}

export function createCategoriesService(repository: CategoriesRepository): CategoriesService {
  async function loadPlatformOrThrow(id: string): Promise<CategoryRecord> {
    const category = await repository.findById(id)
    if (!category || category.scope !== 'PLATFORM') {
      throw notFound('Category not found', 'CATEGORY_NOT_FOUND')
    }
    return category
  }

  async function assertParent(parentId: string, kind: CategoryKind, selfId?: string) {
    const parent = await repository.findById(parentId)
    if (!parent || parent.scope !== 'PLATFORM') {
      throw notFound('Parent category not found', 'CATEGORY_PARENT_NOT_FOUND')
    }
    if (selfId && parent.id === selfId) {
      throw validationError('A category cannot be its own parent')
    }
    if (parent.parentId) {
      throw validationError('Categories can only be nested one level')
    }
    if (parent.kind !== kind) {
      throw validationError('Parent category must be the same kind')
    }
  }

  async function assertUnique(
    kind: CategoryKind,
    parentId: string | null,
    slug: string,
    name: string,
    exceptId?: string,
  ) {
    const existing = await repository.findDuplicate({ kind, parentId, slug, name, exceptId })
    if (existing) {
      throw conflict('A category with this name already exists here', 'CATEGORY_NAME_TAKEN')
    }
  }

  return {
    async requirePlatformCategory(id) {
      const category = await repository.findPlatformById(id)
      if (!category) {
        throw notFound('Category not found', 'CATEGORY_NOT_FOUND')
      }
      return category
    },

    async listCategories(query, actor) {
      assertCanView(actor)
      const [{ items, total }, kindCounts] = await Promise.all([
        repository.findMany(query),
        repository.countByKind(),
      ])
      return {
        data: items.map(toCategoryDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          kindCounts,
        },
      }
    },

    async getCategoryById(id, actor) {
      assertCanView(actor)
      return toCategoryDto(await loadPlatformOrThrow(id))
    },

    async createCategory(input, actor) {
      assertAdmin(actor)
      const parentId = input.parentId ?? null
      const slug = categorySlug(input.name)
      if (parentId) await assertParent(parentId, input.kind)
      await assertUnique(input.kind, parentId, slug, input.name)
      try {
        const created = await repository.create({
          name: input.name,
          nameAr: input.nameAr ?? null,
          slug,
          kind: input.kind,
          parentId,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
        })
        return toCategoryDto(created)
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('A category with this name already exists here', 'CATEGORY_NAME_TAKEN')
        }
        throw error
      }
    },

    async updateCategory(id, input, actor) {
      assertAdmin(actor)
      const category = await loadPlatformOrThrow(id)
      const nextKind = input.kind ?? category.kind
      const nextParentId = input.parentId === undefined ? category.parentId : input.parentId
      const nextName = input.name ?? category.name
      const nextSlug = input.name ? categorySlug(input.name) : category.slug

      if (
        input.kind &&
        input.kind !== category.kind &&
        (category.childCount > 0 || category.listingCount > 0)
      ) {
        throw conflict(
          'Change kind only when this category has no subcategories or listings',
          'CATEGORY_IN_USE',
        )
      }
      if (nextParentId && category.childCount > 0 && nextParentId !== category.parentId) {
        throw validationError('A category with subcategories must stay top-level')
      }
      if (nextParentId) await assertParent(nextParentId, nextKind, category.id)
      if (input.name !== undefined || input.kind !== undefined || input.parentId !== undefined) {
        await assertUnique(nextKind, nextParentId, nextSlug, nextName, category.id)
      }

      try {
        const updated = await repository.update(id, {
          ...input,
          name: input.name,
          slug: input.name ? nextSlug : undefined,
          kind: input.kind,
          parentId: input.parentId,
        })
        return toCategoryDto(updated)
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('A category with this name already exists here', 'CATEGORY_NAME_TAKEN')
        }
        throw error
      }
    },

    async deleteCategory(id, actor) {
      assertAdmin(actor)
      const category = await loadPlatformOrThrow(id)
      if (category.childCount > 0 || category.listingCount > 0) {
        throw conflict(
          'Remove subcategories and listings before deleting this category',
          'CATEGORY_IN_USE',
        )
      }
      await repository.delete(id)
    },
  }
}
