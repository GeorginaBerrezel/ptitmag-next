import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compareSearchRelevance, searchNameScore, sortBySearchRelevance } from '@/lib/catalog/search'

describe('pertinence de la recherche catalogue', () => {
  it('place le mot en début de nom avant le même mot plus loin', () => {
    const pates = searchNameScore('Pâtes complètes', 'pâtes')
    const amande = searchNameScore('Amande grillée pâtes', 'pates')
    assert.equal(pates, 0)
    assert.ok(amande != null && amande > 0)
    assert.ok(compareSearchRelevance(
      { name: 'Pâtes complètes' },
      { name: 'Amande grillée pâtes' },
      'pâtes',
    ) < 0)
  })

  it('laisse l’ordre alphabétique quand le mot est au même endroit', () => {
    const sorted = sortBySearchRelevance(
      [{ name: 'Pâtes complètes' }, { name: 'Pâtes blanches' }],
      'pâtes',
    )
    assert.deepEqual(sorted.map(item => item.name), ['Pâtes blanches', 'Pâtes complètes'])
  })

  it('met un produit dont le mot est seulement dans la description après ceux du nom', () => {
    const sorted = sortBySearchRelevance(
      [
        { name: 'Huile d’olive' },
        { name: 'Amande grillée pâtes' },
        { name: 'Pâtes complètes' },
      ],
      'pâtes',
    )
    assert.deepEqual(sorted.map(item => item.name), [
      'Pâtes complètes',
      'Amande grillée pâtes',
      'Huile d’olive',
    ])
  })
})
