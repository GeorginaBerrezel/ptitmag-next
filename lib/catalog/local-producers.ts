/** Fiches producteurs locaux — source unique (page Producteurs + catalogue). */

export type LocalProducer = {
  slug: string
  displayName: string
  /** Noms possibles en base Supabase / imports Joel */
  aliases: string[]
  location: string
  products: string
  certification: string
  description: string
  emoji: string
  website?: string
  /** Chemin public sous /images/producers/ (png, jpg…) */
  logo?: string
  /** Photo produit en attendant un vrai logo → avatar rond (cover). */
  logoIsPhoto?: boolean
}

export const LOCAL_PRODUCERS: LocalProducer[] = [
  {
    slug: 'fermette-didi',
    displayName: 'La Fermette à Didi',
    aliases: ['La Fermette à Didi', 'Fermette à Didi', 'Fermette a Didi'],
    location: 'Icôgne',
    products: 'Œufs, fromages de chèvre, jambon cru',
    certification: 'Bio Suisse',
    description: 'Œufs, fromages de chèvre et jambon cru — élevage bio valaisan.',
    emoji: '🥚',
    website: 'https://www.lafermetteadidi.com',
    // Logo retiré : fichier 16×16 px trop petit → flou. Réactiver quand Joel envoie un logo HD.
  },
  {
    slug: 'bioterroir',
    displayName: 'Bioterroir',
    aliases: ['Bioterroir'],
    location: 'Bramois',
    products: 'Fruits et légumes',
    certification: 'Bio Suisse',
    description: 'Fruits et légumes bio de saison, cultivés en Valais central.',
    emoji: '🥬',
    website: 'https://www.bioterroir.ch',
    logo: 'bioterroir.jpg',
  },
  {
    slug: 'les-dailles',
    displayName: 'Domaine des Dailles',
    aliases: ['Les Dailles', 'Domaine des Dailles', 'Domaine des dailles'],
    location: 'St-Léonard',
    products: 'Céréales et farines',
    certification: 'Bio Suisse',
    description: 'Céréales et farines bio, moulues et cultivées au Domaine des Dailles.',
    emoji: '🌾',
    website: 'https://lesdailles.ch',
    logo: 'les-dailles.png',
  },
  {
    slug: 'prefecture',
    displayName: 'Domaine de la Préfecture',
    aliases: ['Domaine de la Préfecture', 'Domaine de la Prefecture'],
    location: 'Vétroz',
    products: 'Viande',
    certification: 'Bio Suisse',
    description: 'Viande bio et produits fermiers du Domaine de la Préfecture à Vétroz.',
    emoji: '🥩',
  },
  {
    slug: 'gregory-sermier',
    displayName: 'Grégory Sermier',
    aliases: ['Grégory Sermier', 'Gregory Sermier'],
    location: 'Arbaz',
    products: 'Fromages',
    certification: 'Bio',
    description: 'Fromages artisanaux du Valais, affinés avec soin.',
    emoji: '🧀',
  },
  {
    slug: 'brasseries-ayent',
    displayName: "Brasseries d'Ayent",
    aliases: ["Brasseries d'Ayent", 'Brasseries d Ayent'],
    location: 'Ayent',
    products: 'Bières',
    certification: 'Bio',
    description: 'Bières artisanales bio brassées au cœur des Alpes valaisannes.',
    emoji: '🍺',
    website: 'https://brasseriesdayent.ch',
    logo: 'brasseries-ayent.jpg',
  },
  {
    slug: 'cherouche',
    displayName: 'Chèrouche',
    aliases: ['Chèrouche', 'Cherouche'],
    location: 'Ayent',
    products: 'Vins',
    certification: 'Nature & Bio',
    description: 'Vins nature et bio, élaborés avec des cépages soigneusement sélectionnés.',
    emoji: '🍷',
    website: 'https://cherouche.ch',
    logo: 'cherouche.jpg',
  },
  {
    slug: 'graines-avenir',
    displayName: "Graines d'Avenir",
    aliases: ["Graines d'Avenir", 'Graines d Avenir'],
    location: 'Montana',
    products: 'Pains et pâtisseries',
    certification: 'Bio',
    description: 'Pains et pâtisseries bio, préparés avec des farines locales.',
    emoji: '🥖',
    website: 'https://graines-d-avenir.ch',
    logo: 'graines-avenir.jpg',
    logoIsPhoto: true,
  },
  {
    slug: 'olivier-stephanie',
    displayName: 'Olivier et Stéphanie',
    aliases: ['Olivier et Stéphanie', 'Oliv et Stéph', 'Vins bio et nature'],
    location: 'Itravers',
    products: 'Vins et fruits',
    certification: 'Bio',
    description: 'Vins et fruits bio du terroir valaisan.',
    emoji: '🍇',
  },
  {
    slug: 'cave-levain',
    displayName: 'La Cave à levain',
    aliases: ['La Cave à levain', 'Cave à levain', 'La Cave a levain'],
    location: 'Champlan',
    products: 'Pains et pâtisseries',
    certification: 'Bio',
    description: 'Pains au levain naturel et pâtisseries bio, farines locales.',
    emoji: '🍞',
    website: 'https://la-cave-a-levain.ch',
    logo: 'cave-levain.png',
  },
  {
    slug: 'verene-melchior',
    displayName: 'Vérène Melchior',
    aliases: ['Vérène Melchior', 'Verene Melchior', 'Truffes au chocolat cru'],
    location: 'Savièse',
    products: 'Gourmandises crues et biologiques',
    certification: 'Bio',
    description: 'Truffes et moelleux biologiques.',
    emoji: '🍫',
    logo: 'verene-melchior.jpg',
    logoIsPhoto: true,
  },
  {
    slug: 'evoleina',
    displayName: 'Evoleina Rhodiola',
    aliases: ['Evoleina Rhodiola', 'Evoleina rhodiola'],
    location: 'Evolène',
    products: 'Produits à base de rhodiola rosea',
    certification: 'Bio',
    description: 'Produits à base de rhodiola rosea, cultivée en altitude à Evolène.',
    emoji: '🌿',
    website: 'https://evoleina-rhodiola.ch',
    logo: 'evoleina.png',
  },
]

function normalizeKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')
}

export function findLocalProducer(name: string): LocalProducer | undefined {
  const key = normalizeKey(name)
  for (const producer of LOCAL_PRODUCERS) {
    for (const alias of producer.aliases) {
      const aliasKey = normalizeKey(alias)
      if (key === aliasKey || key.includes(aliasKey) || aliasKey.includes(key)) {
        return producer
      }
    }
  }
  return undefined
}

export function getProducerLogoPath(producer: LocalProducer): string | undefined {
  return producer.logo ? `/images/producers/${producer.logo}` : undefined
}
