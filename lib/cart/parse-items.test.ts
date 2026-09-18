import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseCartItems } from './parse-items'

const ok = {
  productId: '11111111-1111-1111-1111-111111111111',
  productName: 'Farine',
  supplierRef: '100040836',
  supplierId: '22222222-2222-2222-2222-222222222222',
  supplierName: 'Bioterroir',
  supplierType: 'local',
  quantity: 2,
  unitPrice: 3.5,
  unit: 'kg',
  minQuantity: 1,
  allowsPartialOrder: true,
}

describe('parseCartItems', () => {
  it('garde une ligne valide', () => {
    const items = parseCartItems([ok])
    assert.equal(items.length, 1)
    assert.equal(items[0].productName, 'Farine')
    assert.equal(items[0].quantity, 2)
  })

  it('ignore les id non UUID et le JSON cassé', () => {
    assert.deepEqual(parseCartItems(null), [])
    assert.deepEqual(parseCartItems([{ ...ok, productId: 'pas-un-uuid' }]), [])
  })
})
