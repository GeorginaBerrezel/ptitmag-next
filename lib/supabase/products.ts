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
  // true = on peut commander moins que min_quantity avec +10% (colonne UM=1 Biopartner)
  // false = minimum strict, impossible de descendre en-dessous
  allows_partial_order: boolean
  order_deadline: string | null
  is_featured: boolean
  // Référence article fournisseur (ex : numéro article Biopartner)
  supplier_ref: string | null
  supplier: Supplier | null
}

/**
 * Retourne tous les produits actifs avec leur fournisseur.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, description, category,
      unit, unit_price, min_quantity, allows_partial_order,
      order_deadline, is_featured, supplier_ref,
      supplier:suppliers(id, name, website, type)
    `)
    .eq('active', true)
    .order('is_featured', { ascending: false })
    .order('category')
    .order('name')

  if (error) {
    console.error('getProducts error:', error.message)
    return []
  }

  return (data ?? []) as unknown as Product[]
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
