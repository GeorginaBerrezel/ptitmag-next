import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assignCartonNumbers } from './cartons'

describe('assignCartonNumbers', () => {
  it('numérote deux cartons du même produit, et laisse l’autre à 1', () => {
    const numbers = assignCartonNumbers([
      { id: 'b', productId: 'pates', createdAt: '2026-11-02' },
      { id: 'a', productId: 'pates', createdAt: '2026-11-01' },
      { id: 'c', productId: 'riz', createdAt: '2026-11-03' },
    ])
    assert.equal(numbers.get('a'), 1)
    assert.equal(numbers.get('b'), 2)
    assert.equal(numbers.get('c'), 1)
  })
})
