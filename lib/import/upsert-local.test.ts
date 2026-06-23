import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { localProductRef } from '@/lib/import/upsert-local'

describe('localProductRef', () => {
  it('normalise le nom en slug stable', () => {
    assert.equal(localProductRef('Amandes crues bio'), 'amandes-crues-bio')
    assert.equal(localProductRef('  Dattes Medjool  '), 'dattes-medjool')
  })

  it('retourne "produit" si le nom est vide après normalisation', () => {
    assert.equal(localProductRef('   '), 'produit')
  })
})
