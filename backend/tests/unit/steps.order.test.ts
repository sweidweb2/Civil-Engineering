import { describe, expect, it, vi } from 'vitest'

import { Prisma } from '../../src/generated/prisma/client.js'
import {
  allocateOrdered,
  allocateOrderedWithActiveType,
  resolveOrderNb,
} from '../../src/modules/steps/steps.order.js'

describe('resolveOrderNb', () => {
  it('keeps a free requested order', () => {
    expect(resolveOrderNb([0, 2], 1)).toEqual({ orderNb: 1, orderAdjusted: false })
  })

  it('picks the first free slot when order is missing', () => {
    expect(resolveOrderNb([0, 1, 3], undefined)).toEqual({ orderNb: 2, orderAdjusted: true })
  })

  it('picks the first free slot when order is taken', () => {
    expect(resolveOrderNb([0, 1], 0)).toEqual({ orderNb: 2, orderAdjusted: true })
  })
})

describe('allocateOrdered', () => {
  it('persists with the resolved order', async () => {
    const persist = vi.fn().mockResolvedValue({ id: 'row-1', orderNb: 1 })
    const result = await allocateOrdered({
      listUsed: async () => [0],
      requested: undefined,
      persist,
      conflictMessage: 'order conflict',
      conflictCode: 'ORDER_CONFLICT',
    })
    expect(persist).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      data: { id: 'row-1', orderNb: 1 },
      meta: { orderAdjusted: true, orderNb: 1 },
    })
  })

  it('retries after a unique-order race', async () => {
    const persist = vi
      .fn()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      )
      .mockResolvedValueOnce({ id: 'row-2', orderNb: 2 })

    const listUsed = vi.fn().mockResolvedValueOnce([0]).mockResolvedValueOnce([0, 1])

    const result = await allocateOrdered({
      listUsed,
      requested: 1,
      persist,
      conflictMessage: 'order conflict',
      conflictCode: 'ORDER_CONFLICT',
    })

    expect(persist).toHaveBeenCalledTimes(2)
    expect(result.data.orderNb).toBe(2)
    expect(result.meta?.orderAdjusted).toBe(true)
  })

  it('throws a conflict after exhausting retries', async () => {
    const persist = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )

    await expect(
      allocateOrdered({
        listUsed: async () => [0],
        requested: undefined,
        persist,
        conflictMessage: 'order conflict',
        conflictCode: 'ORDER_CONFLICT',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'ORDER_CONFLICT' })
    expect(persist).toHaveBeenCalledTimes(5)
  })
})

describe('allocateOrderedWithActiveType', () => {
  it('resolves the active type then persists with order', async () => {
    const requireActiveInputType = vi.fn().mockResolvedValue({
      id: 'it-1',
      code: 'TEXT',
      label: 'Text',
    })
    const persist = vi.fn().mockResolvedValue({ id: 'input-1' })

    const result = await allocateOrderedWithActiveType({
      requireActiveInputType,
      inputTypeId: 'it-1',
      listUsed: async () => [],
      requested: 3,
      persist,
      conflictMessage: 'order conflict',
      conflictCode: 'ORDER_CONFLICT',
    })

    expect(requireActiveInputType).toHaveBeenCalledWith('it-1')
    expect(persist).toHaveBeenCalledWith(3, { id: 'it-1', code: 'TEXT', label: 'Text' })
    expect(result.data).toEqual({ id: 'input-1' })
    expect(result.meta).toBeUndefined()
  })
})
