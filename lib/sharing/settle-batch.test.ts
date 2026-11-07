import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { expandFailedPools, groupByMemberSupplier } from './settle-batch'

describe('groupByMemberSupplier', () => {
  it('ne renvoie rien sur une liste vide', () => {
    assert.deepEqual(groupByMemberSupplier([]), [])
  })

  it('met deux cartons du même fournisseur dans la même commande', () => {
    const groups = groupByMemberSupplier([
      { memberId: 'marie', supplierId: 'bio', product: 'pâtes carton 1' },
      { memberId: 'marie', supplierId: 'bio', product: 'pâtes carton 2' },
    ])
    assert.equal(groups.length, 1)
    assert.deepEqual(
      groups[0]?.map(line => line.product),
      ['pâtes carton 1', 'pâtes carton 2'],
    )
  })

  it('réunit les produits du même fournisseur pour une personne', () => {
    const groups = groupByMemberSupplier([
      { memberId: 'marie', supplierId: 'bio', product: 'pâtes' },
      { memberId: 'paul', supplierId: 'bio', product: 'pâtes' },
      { memberId: 'marie', supplierId: 'bio', product: 'riz' },
      { memberId: 'marie', supplierId: 'local', product: 'pain' },
    ])
    const keys = groups.map(group => group.map(line => line.product).sort().join('+')).sort()
    assert.deepEqual(keys, ['pain', 'pâtes', 'pâtes+riz'])
  })
})

describe('expandFailedPools', () => {
  it('annule aussi l’autre carton de la même commande', () => {
    const failed = expandFailedPools(
      [{ poolIds: ['pates', 'riz'] }, { poolIds: ['pates'] }],
      ['pates'],
    )
    assert.deepEqual([...failed].sort(), ['pates', 'riz'])
  })

  it('propage l’échec au carton lié par une autre commande', () => {
    const failed = expandFailedPools(
      [{ poolIds: ['a', 'b'] }, { poolIds: ['b', 'c'] }],
      ['a'],
    )
    assert.deepEqual([...failed].sort(), ['a', 'b', 'c'])
  })

  it('laisse un carton d’une autre commande', () => {
    const failed = expandFailedPools(
      [{ poolIds: ['pates'] }, { poolIds: ['miel'] }],
      ['pates'],
    )
    assert.deepEqual([...failed], ['pates'])
  })
})
