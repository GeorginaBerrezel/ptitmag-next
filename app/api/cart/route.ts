import { createClient } from '@/lib/supabase/server'
import { canAccessCatalog } from '@/lib/members/profile'
import { parseCartItems } from '@/lib/cart/parse-items'
import { NextResponse, type NextRequest } from 'next/server'

async function requireCatalogMember() {
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
  const ctx = await requireCatalogMember()
  if ('error' in ctx) return ctx.error

  const { data, error } = await ctx.supabase
    .from('member_carts')
    .select('items')
    .eq('member_id', ctx.user.id)
    .maybeSingle()

  if (error) {
    console.error('[cart GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ exists: false, items: [] })
  }

  return NextResponse.json({
    exists: true,
    items: parseCartItems(data.items),
  })
}

export async function PUT(request: NextRequest) {
  const ctx = await requireCatalogMember()
  if ('error' in ctx) return ctx.error

  const body = await request.json().catch(() => ({})) as { items?: unknown }
  const items = parseCartItems(body.items)

  const { error } = await ctx.supabase
    .from('member_carts')
    .upsert(
      {
        member_id: ctx.user.id,
        items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' },
    )

  if (error) {
    console.error('[cart PUT]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, items })
}
