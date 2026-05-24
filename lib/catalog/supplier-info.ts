/** Infos d'affichage catalogue (descriptions + emoji) — alignées sur la page Producteurs. */

type SupplierDisplay = {
  description: string
  emoji: string
}

const KNOWN: Record<string, SupplierDisplay> = {
  'lafermetteadidi':       { emoji: '🥛', description: 'Produits laitiers et de la ferme, élevage traditionnel.' },
  'bioterroir':            { emoji: '🥬', description: 'Légumes bio de saison cultivés en Valais central.' },
  'lesdailles':            { emoji: '🌿', description: 'Productions locales variées, respect de la terre.' },
  'domainedelaprefecture': { emoji: '🍷', description: 'Vins valaisans issus de cépages nobles du coteau.' },
  'gregorysermier':        { emoji: '🌱', description: 'Maraîchage et productions locales de qualité.' },
  'brasseriesdayent':      { emoji: '🍺', description: 'Bières artisanales brassées au cœur des Alpes valaisannes.' },
  'cherouche':             { emoji: '🫙', description: 'Charcuterie et produits locaux transformés à la ferme.' },
  'olivetsteph':           { emoji: '🧀', description: 'Produits fermiers artisanaux, passion du terroir.' },
  'grainesdavenir':        { emoji: '🌾', description: 'Graines, céréales et légumineuses cultivées en bio.' },
  'lacaveaulevain':        { emoji: '🍞', description: 'Pains au levain naturel, farines bio locales.' },
  'verenemelchior':        { emoji: '🌺', description: 'Plantes aromatiques et médicinales du plateau de Savièse.' },
  'evoleinarhodiola':      { emoji: '🌿', description: 'Rhodiola et plantes adaptogènes cultivées en altitude.' },
  'biopartner':            { emoji: '🏭', description: 'Grossiste bio de référence — large catalogue certifié.' },
  'aromacos':              { emoji: '🌸', description: 'Cosmétiques et huiles essentielles naturelles.' },
  'biopass':               { emoji: '🛒', description: 'Épicerie bio généraliste.' },
  'novoma':                { emoji: '💊', description: 'Compléments alimentaires naturels.' },
  'kingnature':            { emoji: '🌿', description: 'Compléments et extraits naturels.' },
  'groenlabo':             { emoji: '🔬', description: 'Produits issus du laboratoire nature.' },
  'phytolis':              { emoji: '🌱', description: 'Phytothérapie et plantes médicinales.' },
  'laboratoireslrk':       { emoji: '⚗️', description: 'Formules naturelles certifiées.' },
  'algorigin':             { emoji: '🌊', description: 'Algues, spiruline et superaliments.' },
}

const TYPE_FALLBACK: Record<string, SupplierDisplay> = {
  local:         { emoji: '🌾', description: 'Producteur·rice local·e de la région valaisanne.' },
  grossiste_bio: { emoji: '🏭', description: 'Grossiste bio — sélection de produits certifiés.' },
  autre:         { emoji: '🤝', description: 'Fournisseur partenaire du p\'tit mag.' },
}

function normalizeKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')
}

export function getSupplierDisplayInfo(
  name: string,
  type: string,
): SupplierDisplay {
  const key = normalizeKey(name)
  if (KNOWN[key]) return KNOWN[key]

  for (const [knownKey, info] of Object.entries(KNOWN)) {
    if (key.includes(knownKey) || knownKey.includes(key)) return info
  }

  return TYPE_FALLBACK[type] ?? TYPE_FALLBACK.autre
}
