import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergePickupIds, normalizePickupIds } from './pickup-checklist'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('normalizePickupIds', () => {
  it('ignore ce qui n’est pas une ligne de commande', () => {
    assert.deepEqual(normalizePickupIds([A, 'nope', A, 3, `  ${B}  `]), [A, B])
  })
})

describe('mergePickupIds', () => {
  it('ajoute les coches du navigateur qui manquent en base', () => {
    assert.deepEqual(mergePickupIds([A], [A, B]), { all: [A, B], toAdd: [B] })
  })

  it('ne retire pas une coche déjà sur le compte', () => {
    assert.deepEqual(mergePickupIds([A, B], []), { all: [A, B], toAdd: [] })
  })
})
