export type ShareMember = {
  id: string
  displayName: string
}

export type ShareIfIncomplete = 'rollover' | 'cancel'

export type ShareProduct = {
  id: string
  name: string
  supplierName: string
  supplierId?: string | null
  supplierType?: string | null
  supplierRef?: string | null
  unit: string
  unitPrice: number
  minQuantity: number
  allowsPartialOrder: boolean
  /** Objectif à remplir (lot ou kg du sac). Absent sur d’anciens essais locaux. */
  shareTarget?: number
  shareStep?: number
  imageUrl?: string | null
}

export type ShareActionResult = {
  error?: string
  notice?: string
}

export type ShareContribution = {
  memberId: string
  displayName: string
  quantity: number
  /** Quantité demandée, avant qu’une personne ne prenne le trou. */
  requestedQuantity?: number
  /** Plafond total accepté. Absent si la personne ne couvre pas le manque. */
  coverMax?: number | null
  coverAt?: string | null
  /** true une fois la part passée en commande. */
  ordered?: boolean
}

export type SharePoolStatus = 'open' | 'ready' | 'deferred'

export type SharePool = {
  id: string
  productId: string
  /** Copie du produit au moment du Partager. Absente sur d’anciens essais locaux. */
  product?: ShareProduct
  ifIncomplete?: ShareIfIncomplete
  status?: SharePoolStatus
  /** Heure limite du carton : la fermeture des commandes chez le fournisseur. */
  deadlineAt?: string | null
  contributions: ShareContribution[]
}

export type SharePoolView = SharePool & {
  product: ShareProduct
  filled: number
  remaining: number
  isFull: boolean
}
