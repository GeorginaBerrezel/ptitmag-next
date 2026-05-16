import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export type FeaturedProduct = {
  id: string
  name: string
  description: string | null
  unit: string
  unit_price: number | null
  min_quantity: number
  order_deadline: string | null
  supplier_name: string
}

/**
 * GET /api/featured-products
 * Retourne les produits éphémères actifs dont la date limite n'est pas encore dépassée.
 * Endpoint public — pas d'auth requise.
 */
export async function GET() {
  const admin = createAdminClient()

  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('products')
    .select(`
      id, name, description, unit, unit_price, min_quantity, order_deadline,
      supplier:suppliers(name)
    `)
    .eq('is_featured', true)
    .eq('active', true)
    .or(`order_deadline.is.null,order_deadline.gt.${now}`)
    .order('order_deadline', { ascending: true })

  if (error) {
    console.error('featured-products error:', error.message)
    return NextResponse.json([], { status: 500 })
  }

  const products: FeaturedProduct[] = (data ?? []).map((p: {
    id: string
    name: string
    description: string | null
    unit: string
    unit_price: number | null
    min_quantity: number
    order_deadline: string | null
    supplier: { name: string } | { name: string }[] | null
  }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    unit: p.unit,
    unit_price: p.unit_price,
    min_quantity: p.min_quantity,
    order_deadline: p.order_deadline,
    supplier_name: (p.supplier as unknown as { name: string } | null)?.name ?? '',
  }))

  return NextResponse.json(products)
}
