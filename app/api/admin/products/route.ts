import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'

export async function GET(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplier_id')
  if (!supplierId) return NextResponse.json({ error: 'Paramètre supplier_id manquant.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
    .select('id, name, unit, unit_price, category, is_featured, active')
    .eq('supplier_id', supplierId)
    .order('active', { ascending: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json() as {
    id?: string
    is_featured?: boolean
    active?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })
  }

  const update: Record<string, boolean> = {}
  if (typeof body.is_featured === 'boolean') update.is_featured = body.is_featured
  if (typeof body.active === 'boolean') update.active = body.active

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('products')
    .update(update)
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: linked } = await admin
    .from('order_items')
    .select('id')
    .eq('product_id', id)
    .limit(1)

  if ((linked ?? []).length > 0) {
    return NextResponse.json(
      {
        error: 'Ce produit est lié à une ou plusieurs commandes — utilisez « Masquer » plutôt que supprimer.',
        canMask: true,
      },
      { status: 409 },
    )
  }

  const { error } = await admin.from('products').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, deleted: true })
}
