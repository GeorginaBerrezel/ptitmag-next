import type { ShareProduct } from './types'
import { isShareEligible } from './eligibility'

/** Produits fictifs pour les tests unitaires seulement. */
export const MOCK_SHARE_PRODUCTS: ShareProduct[] = [
  {
    id: 'share-farine',
    name: 'Farine complète de spelt',
    supplierName: 'Essai local (fictif)',
    unit: 'kg',
    unitPrice: 4.2,
    minQuantity: 10,
    allowsPartialOrder: false,
  },
  {
    id: 'share-huile',
    name: 'Huile d’olive extra vierge',
    supplierName: 'Essai local (fictif)',
    unit: 'L',
    unitPrice: 8.5,
    minQuantity: 12,
    allowsPartialOrder: false,
  },
  {
    id: 'share-avoine',
    name: 'Flocons d’avoine',
    supplierName: 'Essai local (fictif)',
    unit: 'kg',
    unitPrice: 2.8,
    minQuantity: 25,
    allowsPartialOrder: false,
  },
  {
    id: 'share-tomates',
    name: 'Tomates pelées',
    supplierName: 'Essai local (fictif)',
    unit: 'boîte',
    unitPrice: 2.1,
    minQuantity: 6,
    allowsPartialOrder: false,
  },
  {
    id: 'share-lupin',
    name: 'Farine de lupin',
    supplierName: 'Essai local (fictif)',
    unit: 'Sac 25 kg',
    unitPrice: 3.2,
    minQuantity: 1,
    allowsPartialOrder: false,
  },
  {
    id: 'share-miel',
    name: 'Miel de montagne (pot 250 g)',
    supplierName: 'Essai local (fictif)',
    unit: 'pot',
    unitPrice: 8.9,
    minQuantity: 1,
    allowsPartialOrder: false,
  },
]

export function shareableMockProducts(): ShareProduct[] {
  return MOCK_SHARE_PRODUCTS.filter(isShareEligible)
}

export function findMockProduct(id: string): ShareProduct | undefined {
  return MOCK_SHARE_PRODUCTS.find(p => p.id === id)
}
