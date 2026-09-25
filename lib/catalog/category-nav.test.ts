import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isCatalogueHistoryState,
  readCatalogueNav,
  withCatalogueNav,
} from './category-nav'

describe('readCatalogueNav', () => {
  it('lit le fournisseur et la catégorie', () => {
    assert.deepEqual(readCatalogueNav('?s=abc&c=Fruits'), {
      supplierId: 'abc',
      category: 'Fruits',
    })
  })

  it('accepte une query sans point d’interrogation', () => {
    assert.deepEqual(readCatalogueNav('s=abc'), {
      supplierId: 'abc',
      category: null,
    })
  })
})

describe('withCatalogueNav', () => {
  it('ajoute s et c sans perdre q ni ephemere', () => {
    const href = withCatalogueNav('/fr/commandes?ephemere=1&q=miel', 'sup-1', 'Épicerie')
    assert.equal(href.includes('ephemere=1'), true)
    assert.equal(href.includes('q=miel'), true)
    assert.equal(href.includes('s=sup-1'), true)
    assert.equal(href.includes('c='), true)
    assert.equal(decodeURIComponent(href).includes('Épicerie'), true)
  })

  it('retire s et c pour revenir à la liste', () => {
    const href = withCatalogueNav('/fr/commandes?s=sup-1&c=Fruits&q=miel', null, null)
    assert.equal(href.includes('s='), false)
    assert.equal(href.includes('c='), false)
    assert.equal(href.includes('q=miel'), true)
  })
})

describe('isCatalogueHistoryState', () => {
  it('reconnaît une entrée écrite par le catalogue', () => {
    assert.equal(isCatalogueHistoryState({ catalogueNav: true, s: 'x', c: null }), true)
    assert.equal(isCatalogueHistoryState({ }), false)
    assert.equal(isCatalogueHistoryState(null), false)
  })
})
