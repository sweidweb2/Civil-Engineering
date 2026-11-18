import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type {
  ProviderRecord,
  ProvidersRepository,
} from '../../src/modules/providers/providers.repository.js'
import { createProvidersService } from '../../src/modules/providers/providers.service.js'

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const owner = { id: 'user-provider', roles: ['PROVIDER'] }
const other = { id: 'user-other', roles: ['PROVIDER'] }

function record(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    id: 'prov-1',
    ownerUserId: owner.id,
    name: 'Steel Works',
    description: null,
    logoUrl: null,
    phone: null,
    whatsapp: null,
    email: null,
    website: null,
    address: null,
    city: 'Beirut',
    country: 'Lebanon',
    lat: null,
    lng: null,
    status: 'PENDING',
    createdAt: new Date('2026-09-25T00:00:00.000Z'),
    updatedAt: new Date('2026-09-25T00:00:00.000Z'),
    owner: {
      id: owner.id,
      email: 'provider@example.com',
      profile: { displayName: 'Rami Khoury', firstName: 'Rami', lastName: 'Khoury' },
    },
    ...overrides,
  }
}

function setup(opts?: {
  existing?: ProviderRecord | null
  ownerUser?: { id: string; role: string; status: string } | null
}) {
  const existing = opts?.existing === undefined ? record() : opts.existing
  const repository: ProvidersRepository = {
    findMany: vi.fn(async () => ({ items: existing ? [existing] : [], total: existing ? 1 : 0 })),
    countByStatus: vi.fn(async () => ({ PENDING: existing ? 1 : 0, APPROVED: 0, SUSPENDED: 0 })),
    findById: vi.fn(async () => existing),
    findByOwnerUserId: vi.fn(async () => existing),
    findIdByOwnerUserId: vi.fn(async () => existing?.id ?? null),
    findOwnerUserIdById: vi.fn(async () => existing?.ownerUserId ?? null),
    findOwnerUser: vi.fn(
      async () => opts?.ownerUser ?? { id: owner.id, role: 'PROVIDER', status: 'ACTIVE' },
    ),
    findEligibleOwners: vi.fn(async () => []),
    create: vi.fn(async (input) =>
      record({
        name: input.name,
        ownerUserId: input.ownerUserId,
        status: input.status ?? 'PENDING',
      }),
    ),
    update: vi.fn(async (id, input) => record({ id, ...input, status: input.status ?? 'PENDING' })),
    compareAndSetLogo: vi.fn(async (id, _expected, next) =>
      record({ id, logoUrl: next, status: existing?.status ?? 'PENDING' }),
    ),
  }
  return { repository, service: createProvidersService(repository) }
}

describe('providersService', () => {
  it('forbids non-admins from listing providers', async () => {
    const { service } = setup()
    await expect(service.listProviders({ page: 1, limit: 20 }, owner)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('creates a pending provider for a PROVIDER owner', async () => {
    const { service, repository } = setup({ existing: null })
    const created = await service.createProvider(
      { ownerUserId: owner.id, name: 'Steel Works' },
      admin,
    )
    expect(created.status).toBe('PENDING')
    expect(created.owner?.email).toBe('provider@example.com')
    expect(repository.create).toHaveBeenCalled()
  })

  it('creates a provider without an owner', async () => {
    const { service, repository } = setup({ existing: null })
    repository.create = vi.fn(async (input) =>
      record({
        name: input.name,
        ownerUserId: input.ownerUserId ?? null,
        owner: null,
        status: input.status ?? 'PENDING',
      }),
    )
    const created = await service.createProvider({ name: 'Unassigned Yard' }, admin)
    expect(created.ownerUserId).toBeNull()
    expect(created.owner).toBeNull()
    expect(repository.findOwnerUser).not.toHaveBeenCalled()
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: null, name: 'Unassigned Yard' }),
    )
  })

  it('rejects a second provider for the same owner', async () => {
    const { service } = setup({ existing: record() })
    await expect(
      service.createProvider({ ownerUserId: owner.id, name: 'Other Co' }, admin),
    ).rejects.toBeInstanceOf(AppError)
    await expect(
      service.createProvider({ ownerUserId: owner.id, name: 'Other Co' }, admin),
    ).rejects.toMatchObject({
      code: 'PROVIDER_OWNER_TAKEN',
      status: 409,
    })
  })

  it('rejects an owner who is not a PROVIDER', async () => {
    const { service } = setup({
      existing: null,
      ownerUser: { id: 'user-client', role: 'CLIENT', status: 'ACTIVE' },
    })
    await expect(
      service.createProvider({ ownerUserId: 'user-client', name: 'No Co' }, admin),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('lets the owner update profile fields but not status', async () => {
    const { service, repository } = setup()
    await service.updateProvider('prov-1', { name: 'Steel Works LLC' }, owner)
    expect(repository.update).toHaveBeenCalled()

    await expect(
      service.updateProvider('prov-1', { status: 'APPROVED' }, owner),
    ).rejects.toMatchObject({
      status: 403,
    })
  })

  it('lets an admin approve a provider', async () => {
    const { service } = setup()
    await expect(
      service.updateProvider('prov-1', { status: 'APPROVED' }, admin),
    ).resolves.toMatchObject({
      id: 'prov-1',
    })
  })

  it('lets an admin assign an owner on update', async () => {
    const freeOwner = { id: 'user-free', role: 'PROVIDER', status: 'ACTIVE' }
    const open = record({ id: 'prov-open', ownerUserId: null, owner: null, name: 'Open Yard' })
    const { service, repository } = setup({ existing: open, ownerUser: freeOwner })
    repository.findByOwnerUserId = vi.fn(async () => null)
    repository.update = vi.fn(async (_id, input) =>
      record({
        id: 'prov-open',
        name: 'Open Yard',
        ownerUserId: input.ownerUserId ?? null,
        owner: null,
      }),
    )

    const updated = await service.updateProvider('prov-open', { ownerUserId: freeOwner.id }, admin)
    expect(updated.ownerUserId).toBe(freeOwner.id)
    expect(repository.update).toHaveBeenCalledWith(
      'prov-open',
      expect.objectContaining({ ownerUserId: freeOwner.id }),
    )
  })

  it('forbids a non-admin from changing provider owner', async () => {
    const { service } = setup()
    await expect(
      service.updateProvider('prov-1', { ownerUserId: 'user-other' }, owner),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('forbids another provider from reading the company', async () => {
    const { service } = setup()
    await expect(service.getProviderById('prov-1', other)).rejects.toMatchObject({ status: 403 })
  })
})
