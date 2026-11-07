import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { groupOrdersForDisplay, weekKeyInZurich } from './order-display'

describe('groupOrdersForDisplay', () => {
  it('met le fournisseur en A avant B, et le panier tout récupéré à la fin', () => {
    const groups = groupOrdersForDisplay([
      { id: 'b', createdAt: '2026-11-03T10:00:00Z', supplierName: 'Sapalet', complete: false },
      { id: 'a', createdAt: '2026-11-03T11:00:00Z', supplierName: 'Ayent', complete: false },
      { id: 'c', createdAt: '2026-11-04T11:00:00Z', supplierName: 'Ayent', complete: true },
    ])
    assert.deepEqual(groups.map(group => group.orderIds), [['a'], ['b'], ['c']])
  })

  it('réunit le même fournisseur de la même semaine', () => {
    const groups = groupOrdersForDisplay([
      { id: '1', createdAt: '2026-11-03T08:00:00Z', supplierName: 'Ayent', complete: false },
      { id: '2', createdAt: '2026-11-04T08:00:00Z', supplierName: 'Ayent', complete: false },
    ])
    assert.equal(groups.length, 1)
    assert.deepEqual(groups[0]?.orderIds, ['1', '2'])
    assert.match(groups[0]?.title ?? '', /Ayent/)
  })

  it('sépare deux semaines du même fournisseur, la plus récente d’abord', () => {
    const groups = groupOrdersForDisplay([
      { id: 'old', createdAt: '2026-11-03T08:00:00Z', supplierName: 'Ayent', complete: false },
      { id: 'new', createdAt: '2026-11-10T08:00:00Z', supplierName: 'Ayent', complete: false },
    ])
    assert.deepEqual(groups.map(group => group.orderIds), [['new'], ['old']])
    assert.equal(groups[0]?.title, null)
    assert.equal(groups[1]?.title, null)
  })

  it('ne mélange pas un panier fini et un panier encore à cocher', () => {
    const groups = groupOrdersForDisplay([
      { id: 'done', createdAt: '2026-11-03T08:00:00Z', supplierName: 'Ayent', complete: true },
      { id: 'open', createdAt: '2026-11-04T08:00:00Z', supplierName: 'Ayent', complete: false },
    ])
    assert.equal(groups.length, 2)
    assert.deepEqual(groups.map(group => group.orderIds), [['open'], ['done']])
  })
})

describe('weekKeyInZurich', () => {
  it('prend le lundi de la semaine suisse', () => {
    assert.equal(weekKeyInZurich('2026-11-05T22:30:00Z'), '2026-11-02')
  })

  it('passe à la semaine suivante juste après minuit, heure suisse', () => {
    assert.equal(weekKeyInZurich('2026-11-08T22:00:00Z'), '2026-11-02')
    assert.equal(weekKeyInZurich('2026-11-08T23:30:00Z'), '2026-11-09')
  })
})