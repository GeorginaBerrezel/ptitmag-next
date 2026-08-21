import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getSupplierDisplayName } from '@/lib/catalog/supplier-info'
import { productMatches, supplierMatches } from '@/lib/catalog/search'
import type { Product, Supplier } from '@/lib/supabase/products'

const truffes: Supplier = {
  id: 's1',
  name: 'Truffes au chocolat cru',
  type: 'local',
  website: null,
  orders_open: true,
  order_deadline: null,
}

describe('getSupplierDisplayName', () => {
  it('affiche Vérène Melchior à la place du nom d’import', () => {
    assert.equal(getSupplierDisplayName('Truffes au chocolat cru', 'local'), 'Vérène Melchior')
  })

  it('garde le nom d’un fournisseur sans alias', () => {
    assert.equal(getSupplierDisplayName('Fournisseur inconnu', 'autre'), 'Fournisseur inconnu')
  })
})

describe('recherche catalogue Vérène', () => {
  it('trouve le fournisseur avec Vérène ou Truffes', () => {
    assert.equal(supplierMatches(truffes.name, 'Vérène', truffes.type), true)
    assert.equal(supplierMatches(truffes.name, 'Truffes', truffes.type), true)
  })

  it('trouve un produit via le nom affiché du fournisseur', () => {
    const product: Product = {
      id: '1',
      name: 'Moelleux cacao',
      description: null,
      category: 'Chocolats',
      unit: 'pièce',
      unit_price: 3.5,
      min_quantity: 1,
      allows_partial_order: true,
      order_deadline: null,
      supplier_ref: null,
      is_featured: false,
      supplier: truffes,
    }
    assert.equal(productMatches(product, 'Vérène'), true)
  })
})
