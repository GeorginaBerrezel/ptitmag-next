import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ceilToCentime } from './money'
import { getEffectiveUnitPrice } from './pricing'

describe('ceilToCentime', () => {
  it('arrondit au centime supérieur', () => {
    assert.equal(ceilToCentime(2.04309), 2.05)
    assert.equal(ceilToCentime(10.15059), 10.16)
    assert.equal(ceilToCentime(10.26), 10.26)
  })
})

describe('getEffectiveUnitPrice', () => {
  it('600771490 — Ciel + UC +10 % (TVA déjà dans unit_price)', () => {
    const price = getEffectiveUnitPrice(
      {
        unitPrice: 2.05,
        minQuantity: 3,
        allowsPartialOrder: true,
        quantity: 1,
      },
      { applyCielMarkup: true },
    )
    // 2.05 → ×1,2 = 2.46 → ×1,1 = 2.71
    assert.equal(price, 2.71)
  })

  it('sans majoration UC si qté ≥ min', () => {
    const price = getEffectiveUnitPrice(
      {
        unitPrice: 2.05,
        minQuantity: 3,
        allowsPartialOrder: true,
        quantity: 3,
      },
      { applyCielMarkup: true },
    )
    assert.equal(price, 2.46)
  })
})
