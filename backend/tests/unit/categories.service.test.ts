import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type {
  CategoriesRepository,
  CategoryRecord,
} from '../../src/modules/categories/categories.repository.js'
import { createCategoriesService } from '../../src/modules/categories/categories.service.js'

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const client = { id: 'user-1', roles: ['CLIENT'] }

function record(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: 'cat-1',
    scope: 'PLATFORM',
    providerId: null,
    kind: 'MATERIAL',
    name: 'Cement',
    slug: 'cement',
    parentId: null,
    parentName: null,
    isActive: true,
    sortOrder: 0,
    childCount: 0,
    listingCount: 0,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function setup(opts?: { existing?: CategoryRecord | null; duplicate?: { id: string } | null }) {
  const existing = opts?.existing === undefined ? record() : opts.existing
  const repository: CategoriesRepository = {
    findMany: vi.fn(async () => ({ items: existing ? [existing] : [], total: existing ? 1 : 0 })),
    countByKind: vi.fn(async () => ({
      MATERIAL: existing ? 1 : 0,
      EQUIPMENT: 0,
      SERVICE: 0,
      WORKER: 0,
    })),
    findById: vi.fn(async (id) => (existing && existing.id === id ? existing : existing)),
    findPlatformById: vi.fn(async () =>
      existing && existing.scope === 'PLATFORM'
        ? { id: existing.id, isActive: existing.isActive }
        : null,
    ),
    findDuplicate: vi.fn(async () => opts?.duplicate ?? null),
    create: vi.fn(async (input) => record({ ...input, id: 'cat-new' })),
    update: vi.fn(async (id, input) => record({ id, ...input, slug: input.slug ?? 'cement' })),
    delete: vi.fn(async () => undefined),
  }
  return { repository, service: createCategoriesService(repository) }
}

describe('categoriesService', () => {
  it('forbids non-admins from listing categories', async () => {
    const { service } = setup()
    await expect(service.listCategories({ page: 1, limit: 20 }, client)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('creates a top-level platform category and slugs the name', async () => {
    const { service, repository } = setup({ existing: null })
    const created = await service.createCategory(
      { name: 'Portland Cement', kind: 'MATERIAL' },
      admin,
    )
    expect(created.kind).toBe('MATERIAL')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Portland Cement',
        slug: 'portland-cement',
        parentId: null,
        isActive: true,
      }),
    )
  })

  it('rejects a duplicate name in the same kind', async () => {
    const { service } = setup({ existing: null, duplicate: { id: 'cat-1' } })
    await expect(
      service.createCategory({ name: 'Cement', kind: 'MATERIAL' }, admin),
    ).rejects.toBeInstanceOf(AppError)
    await expect(
      service.createCategory({ name: 'Cement', kind: 'MATERIAL' }, admin),
    ).rejects.toMatchObject({
      status: 409,
      code: 'CATEGORY_NAME_TAKEN',
    })
  })

  it('rejects a parent of a different kind', async () => {
    const { service } = setup({ existing: record({ id: 'parent-1', kind: 'WORKER' }) })
    await expect(
      service.createCategory({ name: 'Cement', kind: 'MATERIAL', parentId: 'parent-1' }, admin),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects nesting under a category that already has a parent', async () => {
    const { service } = setup({
      existing: record({ id: 'child-1', parentId: 'parent-1', kind: 'MATERIAL' }),
    })
    await expect(
      service.createCategory(
        { name: 'White cement', kind: 'MATERIAL', parentId: 'child-1' },
        admin,
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects deleting a category that still has listings', async () => {
    const { service, repository } = setup({ existing: record({ listingCount: 2 }) })
    await expect(service.deleteCategory('cat-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'CATEGORY_IN_USE',
    })
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('requirePlatformCategory returns a platform category without an actor', async () => {
    const { service } = setup()
    await expect(service.requirePlatformCategory('cat-1')).resolves.toEqual({
      id: 'cat-1',
      isActive: true,
    })
  })

  it('requirePlatformCategory throws CATEGORY_NOT_FOUND for missing or non-platform categories', async () => {
    const { service } = setup({ existing: record({ scope: 'PROVIDER' }) })
    await expect(service.requirePlatformCategory('cat-1')).rejects.toMatchObject({
      status: 404,
      code: 'CATEGORY_NOT_FOUND',
    })
  })

  it('lets an admin rename a category', async () => {
    const { service, repository } = setup()
    await service.updateCategory('cat-1', { name: 'Grey cement' }, admin)
    expect(repository.update).toHaveBeenCalledWith(
      'cat-1',
      expect.objectContaining({ name: 'Grey cement', slug: 'grey-cement' }),
    )
  })
})
