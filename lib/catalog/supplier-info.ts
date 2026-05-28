/** Infos d'affichage catalogue — alignées sur local-producers.ts et wholesalers.ts */

import { findLocalProducer, getProducerLogoPath, type LocalProducer } from './local-producers'
import { findWholesaler, getWholesalerLogoPath, type Wholesaler } from './wholesalers'

export type SupplierDisplay = {
  description: string
  emoji: string
  products?: string
  certification?: string
  website?: string
  logo?: string
  displayName?: string
}

const TYPE_FALLBACK: Record<string, SupplierDisplay> = {
  local:         { emoji: '🌾', description: 'Producteur·rice local·e de la région valaisanne.' },
  grossiste_bio: { emoji: '🏭', description: 'Grossiste bio — sélection de produits certifiés.' },
  autre:         { emoji: '🤝', description: 'Fournisseur partenaire du p\'tit mag.' },
}

function fromLocalProducer(producer: LocalProducer): SupplierDisplay {
  return {
    displayName: producer.displayName,
    description: producer.description,
    emoji: producer.emoji,
    products: producer.products,
    certification: producer.certification,
    website: producer.website,
    logo: getProducerLogoPath(producer),
  }
}

function fromWholesaler(wholesaler: Wholesaler): SupplierDisplay {
  return {
    displayName: wholesaler.displayName,
    description: wholesaler.description,
    emoji: wholesaler.emoji,
    website: wholesaler.website,
    logo: getWholesalerLogoPath(wholesaler),
  }
}

export function getSupplierDisplayInfo(
  name: string,
  type: string,
): SupplierDisplay {
  const local = findLocalProducer(name)
  if (local) return fromLocalProducer(local)

  const wholesaler = findWholesaler(name)
  if (wholesaler) return fromWholesaler(wholesaler)

  return TYPE_FALLBACK[type] ?? TYPE_FALLBACK.autre
}
