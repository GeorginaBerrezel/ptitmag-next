import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL ?? 'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// ─── GET — liste des produits d'un fournisseur ────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplier_id')
  if (!supplierId) return NextResponse.json({ error: 'Paramètre supplier_id manquant.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
    .select('id, name, unit, unit_price, category, is_featured, active')
    .eq('supplier_id', supplierId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data ?? [] })
}

// ─── PATCH — basculer is_featured d'un produit ────────────────────────────────

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json() as { id?: string; is_featured?: boolean }
  if (!body.id || typeof body.is_featured !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('products')
    .update({ is_featured: body.is_featured })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
