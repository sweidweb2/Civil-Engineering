import { describe, expect, it, vi } from 'vitest'

import { UniqueConflictError } from '../../src/errors/app-error.js'
import { allocateOrdered, resolveOrderNb } from '../../src/modules/steps/steps.order.js'

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
      .mockRejectedValueOnce(new UniqueConflictError())
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
    expect(result.data).toEqual({ id: 'row-2', orderNb: 2 })
    expect(result.meta?.orderAdjusted).toBe(true)
  })

  it('throws a conflict after exhausting retries', async () => {
    const persist = vi.fn().mockRejectedValue(new UniqueConflictError())

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
