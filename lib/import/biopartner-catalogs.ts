/** Quatre catalogues Biopartner (noms validés Joel). */

export type BiopartnerCatalogKey =
  | 'general'
  | 'emballages'
  | 'surgeles'
  | 'viandes'

export type BiopartnerCatalog = {
  key: BiopartnerCatalogKey
  /** Clé import admin (biopartner_general, …) */
  importKey: string
  name: string
  shortLabel: string
  description: string
}

export const BIOPARTNER_CATALOGS: BiopartnerCatalog[] = [
  {
    key: 'general',
    importKey: 'biopartner_general',
    name: 'Biopartner – Général',
    shortLabel: 'Général',
    description: 'Fruits, légumes, épicerie et assortiment principal.',
  },
  {
    key: 'emballages',
    importKey: 'biopartner_emballages',
    name: 'Biopartner – Grands emballages',
    shortLabel: 'Grands emballages',
    description: 'Emballages et consommables professionnels.',
  },
  {
    key: 'surgeles',
    importKey: 'biopartner_surgeles',
    name: 'Biopartner – Surgelés',
    shortLabel: 'Surgelés',
    description: 'Produits surgelés et deep-frozen.',
  },
  {
    key: 'viandes',
    importKey: 'biopartner_viandes',
    name: 'Biopartner – Viandes fraîches',
    shortLabel: 'Viandes fraîches',
    description: 'Viandes, volailles et charcuterie fraîche.',
  },
]

export const LEGACY_BIOPARTNER_NAME = 'Biopartner'

export function findBiopartnerCatalogByImportKey(key: string): BiopartnerCatalog | undefined {
  return BIOPARTNER_CATALOGS.find(c => c.importKey === key)
}

export function findBiopartnerCatalogByKey(key: BiopartnerCatalogKey): BiopartnerCatalog {
  const catalog = BIOPARTNER_CATALOGS.find(c => c.key === key)
  if (!catalog) throw new Error(`Catalogue Biopartner inconnu : ${key}`)
  return catalog
}

/** Ancien fournisseur monolithique — conservé en base pour l'historique, masqué de l'admin. */
export function isLegacyBiopartnerSupplier(name: string): boolean {
  return name === LEGACY_BIOPARTNER_NAME
}

export function isBiopartnerSupplierName(name: string): boolean {
  return isLegacyBiopartnerSupplier(name) || name.startsWith('Biopartner –')
}
