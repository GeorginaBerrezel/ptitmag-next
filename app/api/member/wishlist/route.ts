import { createClient } from '@/lib/supabase/server'
import { canAccessCatalog } from '@/lib/members/profile'
import { getWishlistProductIds } from '@/lib/supabase/wishlist'
import { NextResponse, type NextRequest } from 'next/server'

async function requireMemberWithCatalog() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessCatalog(profile)) {
    return { error: NextResponse.json({ error: 'Accès catalogue requis.' }, { status: 403 }) }
  }

  return { supabase, user }
}

export async function GET() {
  const ctx = await requireMemberWithCatalog()
  if ('error' in ctx) return ctx.error

  const productIds = await getWishlistProductIds()

  return NextResponse.json({ productIds })
}

export async function POST(request: NextRequest) {
  const ctx = await requireMemberWithCatalog()
  if ('error' in ctx) return ctx.error

  const body = await request.json()
  const productId = (body.productId as string | undefined)?.trim()
  if (!productId) {
    return NextResponse.json({ error: 'Produit manquant.' }, { status: 400 })
  }

  const { data: product } = await ctx.supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle()

  if (!product) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  const { data: existing } = await ctx.supabase
    .from('wishlist_items')
    .select('id')
    .eq('member_id', ctx.user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    const { error } = await ctx.supabase
      .from('wishlist_items')
      .delete()
      .eq('id', existing.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ favorited: false, productId })
  }

  const { error } = await ctx.supabase
    .from('wishlist_items')
    .insert({ member_id: ctx.user.id, product_id: productId, source: 'manual' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ favorited: true, productId })
}
