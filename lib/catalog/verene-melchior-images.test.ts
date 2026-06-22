import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveVereneMelchiorImageId } from '@/lib/catalog/verene-melchior-images'

describe('resolveVereneMelchiorImageId', () => {
  it('associe chaque enrobage à sa photo dédiée', () => {
    assert.equal(resolveVereneMelchiorImageId('Enrobage pistache'), 'enrobage-pistache')
    assert.equal(resolveVereneMelchiorImageId('Enrobage cacao'), 'enrobage-cacao')
    assert.equal(resolveVereneMelchiorImageId('Enrobage framboise'), 'enrobage-framboise')
    assert.equal(resolveVereneMelchiorImageId('Enrobage cacahouète'), 'enrobage-cacahouete')
  })

  it('associe moelleux et boîtes cadeau', () => {
    assert.equal(resolveVereneMelchiorImageId('Moelleux au citron'), 'moelleux-citron')
    assert.equal(resolveVereneMelchiorImageId('Moelleux au chocolat et noix de pécan'), 'moelleux-chocolat-pecan')
    assert.equal(resolveVereneMelchiorImageId('Moelleux au chocolat'), 'moelleux-chocolat')
    assert.equal(resolveVereneMelchiorImageId('Boîte cadeau pour 16 pièces'), 'truffes-cadeau')
  })

  it('retourne null pour un nom inconnu (fallback géré par buildVereneMelchiorImagePath)', () => {
    assert.equal(resolveVereneMelchiorImageId('Produit inconnu'), null)
  })
})
