import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getProductImagePresentation } from '@/lib/catalog/product-image'
import type { Product } from '@/lib/supabase/products'

function product(partial: Partial<Product> & Pick<Product, 'name'>): Product {
  return {
    id: '1',
    name: partial.name,
    description: null,
    category: 'Chocolats',
    unit: 'pièce',
    unit_price: 3.5,
    supplier_ref: null,
    is_featured: false,
    supplier: partial.supplier ?? {
      id: 's1',
      name: 'Truffes au chocolat cru',
      type: 'local',
      orders_open: true,
      order_deadline: null,
    },
    ...partial,
  }
}

describe('getProductImagePresentation', () => {
  it('Vérène (enrobage) : cover centré comme avant', () => {
    const p = getProductImagePresentation(
      product({ name: 'Enrobage cacao' }),
      '/images/products/verene-melchior/enrobage-cacao.avif',
    )
    assert.equal(p.objectFit, 'cover')
    assert.equal(p.objectPosition, 'center')
  })

  it('Graines d\'Avenir : cover (photos paysage remplissent la vignette)', () => {
    const p = getProductImagePresentation(
      product({
        name: 'Pain amidonnier',
        supplier: {
          id: 'ga',
          name: "Graines d'Avenir",
          type: 'local',
          orders_open: true,
          order_deadline: null,
        },
      }),
      '/images/products/graines-avenir/pain-amidonnier.avif',
    )
    assert.equal(p.objectFit, 'cover')
    assert.equal(p.objectPosition, 'center')
  })

  it('Biopartner : contain', () => {
    const p = getProductImagePresentation(
      product({
        name: 'Bière',
        supplier: {
          id: 'bp',
          name: 'Biopartner Général',
          type: 'grossiste_bio',
          orders_open: true,
          order_deadline: null,
        },
      }),
      'https://example.com/biopartner/1.webp',
    )
    assert.equal(p.objectFit, 'contain')
  })
})
