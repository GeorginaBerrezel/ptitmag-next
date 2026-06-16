import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseClosureEditQuantity, parseClosureEditUnitPrice } from '@/lib/orders/update-item'

describe('parseClosureEditQuantity', () => {
  it('accepte entiers et décimaux > 0', () => {
    assert.equal(parseClosureEditQuantity(2), 2)
    assert.equal(parseClosureEditQuantity('0.25'), 0.25)
    assert.equal(parseClosureEditQuantity('1,5'), 1.5)
  })

  it('rejette zéro, négatif ou invalide', () => {
    assert.equal(parseClosureEditQuantity(0), null)
    assert.equal(parseClosureEditQuantity(-1), null)
    assert.equal(parseClosureEditQuantity('abc'), null)
    assert.equal(parseClosureEditQuantity(null), null)
  })
})

describe('parseClosureEditUnitPrice', () => {
  it('accepte zéro et positifs', () => {
    assert.equal(parseClosureEditUnitPrice(0), 0)
    assert.equal(parseClosureEditUnitPrice('12.50'), 12.5)
    assert.equal(parseClosureEditUnitPrice('3,99'), 3.99)
  })

  it('rejette négatif ou invalide', () => {
    assert.equal(parseClosureEditUnitPrice(-0.01), null)
    assert.equal(parseClosureEditUnitPrice(''), null)
    assert.equal(parseClosureEditUnitPrice(undefined), null)
  })
})
