/** Infos d'affichage catalogue — alignées sur lib/catalog/local-producers.ts */

import { findLocalProducer, getProducerLogoPath, type LocalProducer } from './local-producers'

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

const WHOLESALER_INFO: Record<string, SupplierDisplay> = {
  biopartner:            { emoji: '🏭', description: 'Grossiste bio de référence — large catalogue certifié.' },
  aromacos:              { emoji: '🌸', description: 'Cosmétiques et huiles essentielles naturelles.' },
  biopass:               { emoji: '🛒', description: 'Épicerie bio généraliste.' },
  novoma:                { emoji: '💊', description: 'Compléments alimentaires naturels.' },
  kingnature:            { emoji: '🌿', description: 'Compléments et extraits naturels.' },
  groenlabo:             { emoji: '🔬', description: 'Produits issus du laboratoire nature.' },
  phytolis:              { emoji: '🌱', description: 'Phytothérapie et plantes médicinales.' },
  laboratoireslrk:       { emoji: '⚗️', description: 'Formules naturelles certifiées.' },
  algorigin:             { emoji: '🌊', description: 'Algues, spiruline et superaliments.' },
}

function normalizeKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')
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

export function getSupplierDisplayInfo(
  name: string,
  type: string,
): SupplierDisplay {
  const local = findLocalProducer(name)
  if (local) return fromLocalProducer(local)

  const key = normalizeKey(name)
  if (WHOLESALER_INFO[key]) return WHOLESALER_INFO[key]

  for (const [knownKey, info] of Object.entries(WHOLESALER_INFO)) {
    if (key.includes(knownKey) || knownKey.includes(key)) return info
  }

  return TYPE_FALLBACK[type] ?? TYPE_FALLBACK.autre
}
