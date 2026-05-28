import { createClient } from '@/lib/supabase/server'

export type Supplier = {
  id: string
  name: string
  website: string | null
  type: 'local' | 'grossiste_bio' | 'autre'
}

export type Product = {
  id: string
  name: string
  description: string | null
  category: string | null
  unit: string
  unit_price: number | null
  // Quantité minimum de commande sans majoration (colonne UC Biopartner)
  min_quantity: number
  // true = commande partielle autorisée (< UC avec +10 %), false = multiples stricts de UC
  allows_partial_order: boolean
  order_deadline: string | null
  is_featured: boolean
  // Référence article fournisseur (ex : numéro article Biopartner)
  supplier_ref: string | null
  supplier: Supplier | null
}

/**
 * PostgREST / Supabase : au plus 1000 lignes par requête select par défaut.
 * On pagine pour afficher tout le catalogue (ex. Biopartner ~1380 articles).
 */
const PAGE = 1000

/**
 * Retourne tous les produits actifs avec leur fournisseur.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()

  const selectPayload = `
      id, name, description, category,
      unit, unit_price, min_quantity, allows_partial_order,
      order_deadline, is_featured, supplier_ref,
      supplier:suppliers(id, name, website, type)
    `

  const rows: Product[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select(selectPayload)
      .eq('active', true)
      .order('is_featured', { ascending: false })
      .order('category')
      .order('name')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('getProducts error:', error.message)
      return rows.length ? rows : []
    }

    const chunk = (data ?? []) as unknown as Product[]
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  return rows
}

/**
 * Retourne tous les fournisseurs actifs.
 */
export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, website, type')
    .eq('active', true)
    .order('name')

  if (error) {
    console.error('getSuppliers error:', error.message)
    return []
  }

  return (data ?? []) as Supplier[]
}
