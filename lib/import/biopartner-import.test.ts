import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseMinQuantity,
  buildUnitPrice,
  allowsPartialBiopartnerOrder,
  type BiopartnerRow,
} from './biopartner-csv'
import { vatMultiplierFromLabel } from './biopartner-vat'
import { isBiopartnerPriceTtc } from './biopartner-um'
import {
  getMinAllowedQuantity,
  incrementQuantity,
  formatQuantityDisplay,
} from '../catalog/quantity-rules'

function row(partial: Partial<BiopartnerRow>): BiopartnerRow {
  return {
    Article: '100042541',
    Désignation: 'Melon',
    'Désignation 2': '',
    Unité: 'KG',
    UM: '1',
    UC: '2.5',
    'Unité Prix': '',
    Prix: '4,50',
    Origine: '',
    Certifcation: '',
    Emballage: '',
    Facteur: '',
    'Groupe produit principal': '',
    Marque: '',
    'Categorie produit': '',
    ...partial,
  }
}

describe('parseMinQuantity', () => {
  it('parse les UC décimales (2.5 kg)', () => {
    assert.equal(parseMinQuantity('2.5'), 2.5)
    assert.equal(parseMinQuantity('2,5'), 2.5)
  })

  it('garde les UC entières', () => {
    assert.equal(parseMinQuantity('10'), 10)
  })
})

describe('isBiopartnerPriceTtc', () => {
  it('UM 0 = HT', () => {
    assert.equal(isBiopartnerPriceTtc('0'), false)
    assert.equal(isBiopartnerPriceTtc('0.0'), false)
  })

  it('UM 1 = TTC', () => {
    assert.equal(isBiopartnerPriceTtc('1'), true)
    assert.equal(isBiopartnerPriceTtc('1.0'), true)
  })
})

describe('buildUnitPrice', () => {
  it('applique TVA 8.1 % sur HT', () => {
    const price = buildUnitPrice(row({
      UM: '0',
      Prix: '9,39',
      TVA: 'Taux TVA normal 8.1%',
    }))
    assert.equal(price, 10.15)
  })

  it('applique TVA 2.6 % sur HT alimentaire', () => {
    const price = buildUnitPrice(row({
      Article: '200002982',
      UM: '0',
      Prix: '10,00',
      TVA: 'Taux TVA réduit 2.6%',
    }))
    assert.equal(price, 10.26)
  })

  it('ne double pas la TVA si UM = TTC', () => {
    const price = buildUnitPrice(row({ UM: '1', Prix: '10,15', TVA: 'Taux TVA normal 8.1%' }))
    assert.equal(price, 10.15)
  })
})

describe('quantity rules UC 2.5', () => {
  const rules = { minQuantity: 2.5, allowsPartialOrder: true }

  it('minimum affiché = 2.5', () => {
    assert.equal(getMinAllowedQuantity(rules), 1)
    assert.equal(getMinAllowedQuantity({ minQuantity: 2.5, allowsPartialOrder: false }), 2.5)
  })

  it('incrémente par 2.5', () => {
    assert.equal(incrementQuantity(2.5, { minQuantity: 2.5, allowsPartialOrder: false }), 5)
    assert.equal(formatQuantityDisplay(2.5, { minQuantity: 2.5, allowsPartialOrder: false }), '2.5')
  })
})

describe('vatMultiplierFromLabel', () => {
  it('reconnaît les libellés courants', () => {
    assert.equal(vatMultiplierFromLabel('Taux TVA normal 8.1%'), 1.081)
    assert.equal(vatMultiplierFromLabel('Taux TVA réduit 2.6%'), 1.026)
  })
})
