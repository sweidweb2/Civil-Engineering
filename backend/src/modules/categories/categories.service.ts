import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import {
  conflict,
  forbidden,
  isUniqueConflictError,
  notFound,
  unauthorized,
  validationError,
} from '../../errors/app-error.js'
import { getRequestLogger } from '../../logging/index.js'
import { auditActivity } from '../logging/index.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import type { AllowedFileMime } from '../files/files.schema.js'
import type { FilesService } from '../files/files.service.js'
import type { CategoriesRepository, CategoryRecord } from './categories.repository.js'
import type {
  CategoryKind,
  CreateCategoryBody,
  ListCategoriesQuery,
  UpdateCategoryBody,
} from './categories.schema.js'
import type { Category, PaginatedCategories } from './categories.types.js'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type CategoriesService = {
  listCategories: (query: ListCategoriesQuery, actor: AuthActor) => Promise<PaginatedCategories>
  getCategoryById: (id: string, actor: AuthActor) => Promise<Category>
  createCategory: (input: CreateCategoryBody, actor: AuthActor) => Promise<Category>
  updateCategory: (id: string, input: UpdateCategoryBody, actor: AuthActor) => Promise<Category>
  uploadImage: (
    id: string,
    actor: AuthActor,
    file: { mime: AllowedFileMime; originalName: string; body: Buffer },
  ) => Promise<Category>
  deleteCategory: (id: string, actor: AuthActor) => Promise<void>
  /** Internal lookup for other modules (no actor); throws CATEGORY_NOT_FOUND. */
  requirePlatformCategory: (id: string) => Promise<{ id: string; isActive: boolean }>
}

export type CategoriesServiceDeps = {
  repository: CategoriesRepository
  filesService?: FilesService
  storage?: StorageService
  config?: AppConfig
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

export function toCategoryDto(record: CategoryRecord, imageUrl: string | null = null): Category {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    nameAr: record.nameAr,
    slug: record.slug,
    parentId: record.parentId,
    parentName: record.parentName,
    parentNameAr: record.parentNameAr,
    imagePath: record.imagePath,
    imageUrl,
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

/** Full catalog (admin/PM/provider) vs worker-trade picker only. */
type CategoryViewAccess = 'full' | 'worker-trades'

function assertCanView(actor: AuthActor): CategoryViewAccess {
  if (isAdmin(actor.roles) || actor.roles.includes('MANAGER') || actor.roles.includes('PROVIDER')) {
    return 'full'
  }
  // Workers need WORKER categories for CV primary-trade / skills pickers.
  if (actor.roles.includes('WORKER')) {
    return 'worker-trades'
  }
  throw forbidden('Only admins, project managers, providers, and workers can view categories')
}

export function createCategoriesService(deps: CategoriesServiceDeps): CategoriesService {
  const { repository, filesService, storage, config } = deps

  async function resolveImageUrl(imagePath: string | null): Promise<string | null> {
    if (!imagePath || !storage || !config) return null
    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath: imagePath })
    } catch {
      return null
    }
  }

  async function toDto(record: CategoryRecord): Promise<Category> {
    return toCategoryDto(record, await resolveImageUrl(record.imagePath))
  }

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

  async function deleteStorageKey(key: string | null): Promise<void> {
    if (!key || !storage) return
    try {
      await storage.deleteObject(key)
    } catch (error) {
      getRequestLogger().warn(
        { err: error, key, kind: 'categories.delete_object_failed' },
        'failed to delete category storage object',
      )
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
      const access = assertCanView(actor)
      if (access === 'worker-trades') {
        if (query.kind != null && query.kind !== 'WORKER') {
          throw forbidden('Workers can only view worker trade categories')
        }
      }
      const effectiveQuery: ListCategoriesQuery =
        access === 'worker-trades' ? { ...query, kind: 'WORKER' } : query
      const [{ items, total }, kindCounts] = await Promise.all([
        repository.findMany(effectiveQuery),
        repository.countByKind(),
      ])
      const data = await Promise.all(items.map((item) => toDto(item)))
      return {
        data,
        meta: {
          page: effectiveQuery.page,
          limit: effectiveQuery.limit,
          total,
          kindCounts,
        },
      }
    },

    async getCategoryById(id, actor) {
      const access = assertCanView(actor)
      const category = await loadPlatformOrThrow(id)
      if (access === 'worker-trades' && category.kind !== 'WORKER') {
        throw forbidden('Workers can only view worker trade categories')
      }
      return toDto(category)
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
        return toDto(created)
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
        return toDto(updated)
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('A category with this name already exists here', 'CATEGORY_NAME_TAKEN')
        }
        throw error
      }
    },

    async uploadImage(id, actor, file) {
      if (!actor.id) throw unauthorized()
      assertAdmin(actor)
      if (!filesService) {
        throw validationError('File uploads are not configured')
      }
      if (!IMAGE_MIMES.has(file.mime)) {
        throw validationError('Category image must be JPEG, PNG, or WebP')
      }
      const existing = await loadPlatformOrThrow(id)
      const uploaded = await filesService.uploadBytes(actor, {
        entityType: 'CATEGORY',
        entityId: id,
        mime: file.mime,
        originalName: file.originalName,
        body: file.body,
      })
      const record = await repository.updateImagePath(id, uploaded.key)
      if (existing.imagePath && existing.imagePath !== uploaded.key) {
        await deleteStorageKey(existing.imagePath)
      }
      return toDto(record)
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
      await deleteStorageKey(category.imagePath)
      auditActivity({
        userId: actor.id,
        action: 'categories.delete',
        entity: 'category',
        entityId: id,
        meta: { kind: category.kind, name: category.name },
      })
    },
  }
}
