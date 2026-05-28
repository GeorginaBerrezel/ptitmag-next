/** Fiches grossistes / fournisseurs bio — page Producteurs + catalogue. */

export type Wholesaler = {
  slug: string
  displayName: string
  aliases: string[]
  description: string
  emoji: string
  website?: string
  logo?: string
  /** Qualité du logo récupéré automatiquement */
  logoQuality?: 'official' | 'favicon' | 'fallback'
}

export const WHOLESALERS: Wholesaler[] = [
  {
    slug: 'biopartner-general',
    displayName: 'Biopartner – Général',
    aliases: ['Biopartner – Général', 'Biopartner - Général', 'Biopartner'],
    description: 'Fruits, légumes, épicerie et assortiment principal.',
    emoji: '🏭',
    website: 'https://www.biopartner.ch',
    logo: 'biopartner.jpg',
    logoQuality: 'fallback',
  },
  {
    slug: 'biopartner-emballages',
    displayName: 'Biopartner – Grands emballages',
    aliases: ['Biopartner – Grands emballages', 'Biopartner - Grands emballages'],
    description: 'Emballages et consommables professionnels.',
    emoji: '📦',
    website: 'https://www.biopartner.ch',
    logo: 'biopartner.jpg',
    logoQuality: 'fallback',
  },
  {
    slug: 'biopartner-surgeles',
    displayName: 'Biopartner – Surgelés',
    aliases: ['Biopartner – Surgelés', 'Biopartner - Surgelés', 'Biopartner – Surgeles'],
    description: 'Produits surgelés et deep-frozen.',
    emoji: '🧊',
    website: 'https://www.biopartner.ch',
    logo: 'biopartner.jpg',
    logoQuality: 'fallback',
  },
  {
    slug: 'biopartner-viandes',
    displayName: 'Biopartner – Viandes fraîches',
    aliases: ['Biopartner – Viandes fraîches', 'Biopartner - Viandes fraiches'],
    description: 'Viandes, volailles et charcuterie fraîche.',
    emoji: '🥩',
    website: 'https://www.biopartner.ch',
    logo: 'biopartner.jpg',
    logoQuality: 'fallback',
  },
  {
    slug: 'aromacos',
    displayName: 'Aromacos',
    aliases: ['Aromacos', 'AromaCos'],
    description: 'Cosmétiques et huiles essentielles naturelles.',
    emoji: '🌸',
    website: 'https://www.aromacos.ch',
    logo: 'aromacos.png',
    logoQuality: 'favicon',
  },
  {
    slug: 'biopass',
    displayName: 'Bio-pass',
    aliases: ['Bio-pass', 'Biopass', 'Bio Pass'],
    description: 'Plateforme de commande bio pour commerçants.',
    emoji: '🛒',
    website: 'https://www.bio-pass.ch',
    logo: 'biopass.svg',
    logoQuality: 'official',
  },
  {
    slug: 'novoma',
    displayName: 'Novoma',
    aliases: ['Novoma', 'NOVOMA'],
    description: 'Compléments alimentaires naturels.',
    emoji: '💊',
    website: 'https://novoma.com',
    logo: 'novoma.svg',
    logoQuality: 'official',
  },
  {
    slug: 'kingnature',
    displayName: 'Kingnature',
    aliases: ['Kingnature', 'King Nature'],
    description: 'Compléments et extraits naturels.',
    emoji: '🌿',
    website: 'https://www.kingnature.ch',
    logo: 'kingnature.png',
    logoQuality: 'official',
  },
  {
    slug: 'groen-labo',
    displayName: 'Groen Labo',
    aliases: ['Groen Labo', 'GroenLabo', 'Groen labo'],
    description: 'Produits issus du laboratoire nature.',
    emoji: '🔬',
    website: 'https://groenlabo.com',
    logo: 'groen-labo.jpg',
    logoQuality: 'official',
  },
  {
    slug: 'phytolis',
    displayName: 'Phytolis',
    aliases: ['Phytolis'],
    description: 'Phytothérapie et plantes médicinales.',
    emoji: '🌱',
    website: 'https://www.phytolis.ch',
    logo: 'phytolis.svg',
    logoQuality: 'official',
  },
  {
    slug: 'lrk',
    displayName: 'Laboratoires LRK',
    aliases: ['Laboratoires LRK', 'LRK', 'Labo LRK'],
    description: 'Formules naturelles certifiées.',
    emoji: '⚗️',
    website: 'https://www.lrk.ch',
    logo: 'lrk.png',
    logoQuality: 'favicon',
  },
  {
    slug: 'algorigin',
    displayName: 'Algorigin',
    aliases: ['Algorigin'],
    description: 'Algues, spiruline et superaliments.',
    emoji: '🌊',
    website: 'https://algorigin.com',
    logo: 'algorigin.png',
    logoQuality: 'official',
  },
]

function normalizeKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')
}

export function findWholesaler(name: string): Wholesaler | undefined {
  const key = normalizeKey(name)
  for (const w of WHOLESALERS) {
    for (const alias of w.aliases) {
      const aliasKey = normalizeKey(alias)
      if (key === aliasKey || key.includes(aliasKey) || aliasKey.includes(key)) {
        return w
      }
    }
  }
  return undefined
}

export function getWholesalerLogoPath(wholesaler: Wholesaler): string | undefined {
  return wholesaler.logo ? `/images/wholesalers/${wholesaler.logo}` : undefined
}
