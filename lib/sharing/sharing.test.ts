import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getSharePlan, isShareEligible, parseBulkPack } from './eligibility'
import { formatShareCompact } from './from-product'
import {
  clampJoinQuantity,
  isPoolFull,
  maxOpenShareQuantity,
  poolFilled,
  poolRemaining,
  shareStepOf,
  shareTargetOf,
  wouldTakeWholeCarton,
} from './pool-math'
import { MOCK_SHARE_PRODUCTS, shareableMockProducts } from './mock-catalog'
import { isShareDeadlinePassed, rollShareDeadline } from './lifecycle'

describe('isShareEligible', () => {
  it('refuse un produit déjà en part maison (miel, yaourt, bouteille seule)', () => {
    assert.equal(isShareEligible({ minQuantity: 1, unit: 'pot', unitPrice: 8.9 }), false)
    assert.equal(isShareEligible({ minQuantity: 1, unit: 'bouteille', unitPrice: 24 }), false)
    assert.equal(isShareEligible({ minQuantity: 0.25, unit: 'kg', unitPrice: 12 }), false)
  })

  it('accepte un lot, même pas cher (6 pots, 12 sachets)', () => {
    assert.equal(isShareEligible({ minQuantity: 6, unit: 'pièce', unitPrice: 2 }), true)
    assert.equal(isShareEligible({ minQuantity: 12, unit: 'Sachet de 25 g', unitPrice: 2.17 }), true)
    assert.equal(isShareEligible({ minQuantity: 12, unit: 'bouteille', unitPrice: 4 }), true)
    assert.equal(isShareEligible({ minQuantity: 2, unit: 'pièce', unitPrice: 3.5 }), true)
  })

  it('accepte un gros format vendu à l’unité (sac, carton 6×)', () => {
    assert.equal(isShareEligible({ minQuantity: 1, unit: 'Sac 25 kg', unitPrice: 3.2 }), true)
    assert.equal(isShareEligible({ minQuantity: 1, unit: 'carton(s) 6 x 1 L', unitPrice: 18 }), true)
  })
})

describe('getSharePlan / parseBulkPack', () => {
  it('un lot se partage à l’unité, jusqu’au minimum', () => {
    const plan = getSharePlan({ minQuantity: 6, unit: 'boîte', unitPrice: 2 })
    assert.deepEqual(plan, { eligible: true, kind: 'lot', target: 6, step: 1 })
  })

  it('un sac 25 kg se coupe par 0,5 kg', () => {
    assert.deepEqual(parseBulkPack('Sac 25 kg'), { target: 25, step: 0.5 })
    const plan = getSharePlan({ minQuantity: 1, unit: 'Sac 25 kg', unitPrice: 3.2 })
    assert.deepEqual(plan, { eligible: true, kind: 'bulk', target: 25, step: 0.5 })
  })

  it('un carton 6 × se partage en 6', () => {
    assert.deepEqual(parseBulkPack('carton(s) 6 x 1 L'), { target: 6, step: 1 })
  })
})

describe('catalogue fictif', () => {
  it('n’offre le partage que sur les lots et gros formats', () => {
    const ids = shareableMockProducts().map(p => p.id)
    assert.deepEqual(ids, ['share-farine', 'share-huile', 'share-avoine', 'share-tomates', 'share-lupin'])
    const miel = MOCK_SHARE_PRODUCTS.find(p => p.id === 'share-miel')
    assert.equal(miel && isShareEligible(miel), false)
    const lupin = MOCK_SHARE_PRODUCTS.find(p => p.id === 'share-lupin')
    assert.equal(lupin && shareTargetOf(lupin), 25)
    assert.equal(lupin && shareStepOf(lupin), 0.5)
  })
})

describe('pool math', () => {
  it('calcule le reste', () => {
    assert.equal(poolFilled([{ memberId: 'a', displayName: 'A', quantity: 3 }, { memberId: 'b', displayName: 'B', quantity: 2 }]), 5)
    assert.equal(poolRemaining(10, 6), 4)
    assert.equal(isPoolFull(10, 10), true)
    assert.equal(isPoolFull(10, 9.999), false)
  })

  it('empêche de dépasser le reste, avec le pas', () => {
    assert.equal(clampJoinQuantity(5, 4), 4)
    assert.equal(clampJoinQuantity(0, 4), 0)
    assert.equal(clampJoinQuantity(2, 0), 0)
    assert.equal(clampJoinQuantity(0.25, 4, 0.5), 0)
    assert.equal(clampJoinQuantity(0.5, 4, 0.5), 0.5)
  })

  it('résume le carton en une ligne', () => {
    assert.equal(formatShareCompact(3, 6, false), '3 / 6')
    assert.equal(formatShareCompact(6, 6, true), 'Complet 6 / 6')
  })

  it('refuse de « partager » tout le carton seule', () => {
    assert.equal(wouldTakeWholeCarton(12, 12), true)
    assert.equal(wouldTakeWholeCarton(1, 12), false)
    assert.equal(maxOpenShareQuantity(12, 1), 11)
    assert.equal(maxOpenShareQuantity(25, 0.5), 24.5)
  })
})

describe('rollShareDeadline', () => {
  it('reporte de 7 jours tant que la date est passée', () => {
    const from = '2026-09-10T12:00:00.000Z'
    const now = new Date('2026-09-18T12:00:00.000Z')
    assert.equal(rollShareDeadline(from, now), '2026-09-24T12:00:00.000Z')
  })

  it('ne bouge pas si la date est encore devant', () => {
    const from = '2026-09-24T12:00:00.000Z'
    const now = new Date('2026-09-18T12:00:00.000Z')
    assert.equal(rollShareDeadline(from, now), from)
    assert.equal(isShareDeadlinePassed(from, now), false)
    assert.equal(isShareDeadlinePassed('2026-09-10T12:00:00.000Z', now), true)
  })
})
