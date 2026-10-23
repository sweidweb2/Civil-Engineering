import { describe, expect, it } from 'vitest'

import { resolveOrderNb } from '../../src/modules/steps/steps.order.js'

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
