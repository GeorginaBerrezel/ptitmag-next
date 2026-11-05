import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseLocalSheet } from './local-suppliers'

describe('parseLocalSheet', () => {
  it('prend la catégorie dans une ligne sans prix', () => {
    const rows = [
      ['Produit', '', '', "Prix d'achat TTC", ''],
      ['Fromages', '', '', '', ''],
      ['Tomme', '', '', 12.5, 'pièce'],
      ['Pains', '', '', '', ''],
      ['Miche', '', '', 6, 'pièce'],
    ]
    const products = parseLocalSheet(rows, 'Produits fermiers')
    assert.deepEqual(
      products.map(product => [product.name, product.category]),
      [['Tomme', 'Fromages'], ['Miche', 'Pains']],
    )
  })

  it('retire le texte entre parenthèses du nom de catégorie', () => {
    const rows = [
      ['Produit', '', '', "Prix d'achat TTC", ''],
      ['Fromages (chèvre)', '', '', '', ''],
      ['Tomme', '', '', 12.5, 'pièce'],
    ]
    const products = parseLocalSheet(rows, 'Produits fermiers')
    assert.equal(products[0]?.category, 'Fromages')
  })

  it('ignore une ligne Total', () => {
    const rows = [
      ['Produit', '', '', "Prix d'achat TTC", ''],
      ['Fromages', '', '', '', ''],
      ['Total fromages', '', '', '', ''],
      ['Tomme', '', '', 12.5, 'pièce'],
    ]
    const products = parseLocalSheet(rows, 'Produits fermiers')
    assert.deepEqual(
      products.map(product => [product.name, product.category]),
      [['Tomme', 'Fromages']],
    )
  })

  it('garde une ligne qui a un prix comme produit', () => {
    const rows = [
      ['Produit', '', '', "Prix d'achat TTC", ''],
      ['Fromages', '', '', '', ''],
      ['Chèvre', '', '', 8, 'pièce'],
      ['Tomme', '', '', 12.5, 'pièce'],
    ]
    const products = parseLocalSheet(rows, 'Produits fermiers')
    assert.deepEqual(
      products.map(product => [product.name, product.category]),
      [['Chèvre', 'Fromages'], ['Tomme', 'Fromages']],
    )
  })

  it('garde la catégorie du fournisseur s’il n’y a pas de section', () => {
    const rows = [
      ['Produit', '', '', "Prix d'achat TTC", ''],
      ['Tomme', '', '', 12.5, 'pièce'],
    ]
    const products = parseLocalSheet(rows, 'Fromages')
    assert.equal(products[0]?.category, 'Fromages')
  })
})