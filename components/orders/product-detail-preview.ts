/** Données minimales pour ouvrir la fiche produit (panier ou ligne commande). */
export type ProductDetailPreview = {
  productId: string
  name: string
  supplierName?: string
  supplierId?: string
  supplierType?: string
  supplierRef?: string | null
  unit?: string
  unitPrice?: number | null
  /** Quantité dans le panier ou la commande (affichage contexte). */
  quantity?: number
  /** Prix unitaire payé sur la ligne commande (peut différer du catalogue). */
  orderUnitPrice?: number
}
