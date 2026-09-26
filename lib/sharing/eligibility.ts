/** Un produit se partage si on est forcé d’en prendre plus qu’une part maison. */

export type ShareEligibilityInput = {
  minQuantity: number
  unit?: string | null
  unitPrice?: number | null
}

export type SharePlan = {
  eligible: true
  kind: 'lot' | 'bulk'
  /** Quantité à remplir à plusieurs. */
  target: number
  /** Pas du curseur « ma part ». */
  step: number
}

function parseDecimal(raw: string): number {
  return Number(raw.replace(',', '.'))
}

/** Gros format vendu à l’unité : sac 25 kg, meule, carton 6×, bag-in-box.
 *  Garder aligné avec share_plan() dans supabase/migrations/20260908_share_pools.sql. */
export function parseBulkPack(unit: string | null | undefined): { target: number; step: number } | null {
  const u = (unit ?? '').trim()
  if (!u) return null

  const multi = u.match(/(\d+)\s*[x×]\s*/i)
  if (multi) {
    const n = Number(multi[1])
    if (n >= 2) return { target: n, step: 1 }
  }

  const kg = u.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
  if (kg && /sac|seau|meule|pièce|piece|bloc|pointe|bidon/i.test(u)) {
    const n = parseDecimal(kg[1])
    if (n >= 1.5) return { target: n, step: n >= 5 ? 0.5 : 0.5 }
  }

  const litres = u.match(/(\d+(?:[.,]\d+)?)\s*l\b/i)
  if (litres && /bag\s*in\s*box|bib|bidon|seau/i.test(u)) {
    const n = parseDecimal(litres[1])
    if (n >= 2) return { target: n, step: n >= 5 ? 0.5 : 1 }
  }

  return null
}

function lotStep(minQuantity: number): number {
  if (Number.isInteger(minQuantity)) return 1
  return 0.5
}

export function getSharePlan(product: ShareEligibilityInput): SharePlan | null {
  const min = product.minQuantity
  if (!Number.isFinite(min) || min <= 0) return null

  if (min >= 2) {
    return { eligible: true, kind: 'lot', target: min, step: lotStep(min) }
  }

  const pack = parseBulkPack(product.unit)
  if (pack) {
    return { eligible: true, kind: 'bulk', target: pack.target, step: pack.step }
  }

  return null
}

export function isShareEligible(product: ShareEligibilityInput): boolean {
  return getSharePlan(product) != null
}

/** Local actif. preprod/www : NEXT_PUBLIC_SHARE_PROTOTYPE=1. Jamais sur www sans accord. */
export function isShareEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SHARE_PROTOTYPE === '1') return true
  return process.env.NODE_ENV !== 'production'
}

/** @deprecated préférer isShareEnabled */
export function isSharePrototypeEnabled(): boolean {
  return isShareEnabled()
}

export const SHARE_MESSAGES = {
  wholeCarton:
    'Ça remplit tout le carton. Pour commander seule, utilise + Panier. Pour partager, prends une petite part.',
  noRoom: 'Il ne reste plus assez de place sur ce carton.',
  tooSmall: 'Quantité trop petite.',
  joinExisting: 'Quelqu’un vient d’ouvrir ce produit. Tu rejoins le même carton.',
  withdrawn: 'Tu as retiré ta part. Le curseur des autres se met à jour tout de suite.',
  deadlinePassed: 'Le délai est passé. Ce partage est clos.',
  cancelled: 'Pas assez de parts : ce carton ne sera pas commandé.',
  rolledOver: 'Reporté à la semaine prochaine. Le délai a changé.',
  unavailable: 'Ce produit n’est plus disponible.',
  priceChanged: 'Le prix a changé. Ta part a été mise à jour.',
  alreadyOrdered: 'Ta part de ce carton a déjà été commandée.',
  poolOrdering: 'Quelqu’un a déjà commandé ce carton. Tu ne peux plus modifier les parts.',
  sqlMissing: 'Les partages ne sont pas encore prêts en base. Réessaie un peu plus tard.',
  supplierClosed: 'Les commandes de ce fournisseur sont fermées. Le partage reprendra à la prochaine ouverture.',
  coverTooSmall: 'Ce maximum est égal à ta part : tu ne couvres rien en plus. Monte-le, ou laisse la case vide.',
  coverTooBig: 'Le maximum est le carton entier.',
} as const
