import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatClosureBaselineLabel,
  orderItemClosureModified,
  orderItemHasClosureBaseline,
} from '@/lib/orders/closure-baseline'

describe('orderItemClosureModified', () => {
  it('false sans baseline', () => {
    assert.equal(
      orderItemClosureModified({ quantity: 2, unit_price: 3, closure_baseline_quantity: null, closure_baseline_unit_price: null }),
      false,
    )
  })

  it('true si qté ou prix diffère de la baseline', () => {
    assert.equal(
      orderItemClosureModified({
        quantity: 1,
        unit_price: 2.61,
        closure_baseline_quantity: 12,
        closure_baseline_unit_price: 2.61,
      }),
      true,
    )
    assert.equal(
      orderItemClosureModified({
        quantity: 12,
        unit_price: 0,
        closure_baseline_quantity: 12,
        closure_baseline_unit_price: 2.61,
      }),
      true,
    )
  })

  it('false après rétablissement (valeurs = baseline)', () => {
    assert.equal(
      orderItemClosureModified({
        quantity: 12,
        unit_price: 2.61,
        closure_baseline_quantity: 12,
        closure_baseline_unit_price: 2.61,
      }),
      false,
    )
  })
})

describe('formatClosureBaselineLabel', () => {
  it('formate qté entière et prix CHF', () => {
    assert.equal(formatClosureBaselineLabel(12, 2.61, 'UC'), '12 UC × CHF 2.61')
  })
})

describe('orderItemHasClosureBaseline', () => {
  it('true seulement si les deux champs sont renseignés', () => {
    assert.equal(
      orderItemHasClosureBaseline({
        quantity: 1,
        unit_price: 1,
        closure_baseline_quantity: 1,
        closure_baseline_unit_price: null,
      }),
      false,
    )
  })
})
