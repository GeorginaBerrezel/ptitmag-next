import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'

type PatchBody = {
  id?: string
  active?: boolean
  orders_open?: boolean
  order_deadline?: string | null
}

// ─── GET — liste des fournisseurs avec nombre de produits ─────────────────────

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const admin = createAdminClient()

  const { data: suppliers, error: sErr } = await admin
    .from('suppliers')
    .select('id, name, type, active, orders_open, order_deadline')
    .order('name')

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const { data: counts, error: cErr } = await admin
    .from('products')
    .select('supplier_id')
    .eq('active', true)

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  const countMap: Record<string, number> = {}
  for (const p of counts ?? []) {
    countMap[p.supplier_id] = (countMap[p.supplier_id] ?? 0) + 1
  }

  const result = (suppliers ?? []).map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    active: s.active ?? true,
    orders_open: s.orders_open ?? false,
    order_deadline: s.order_deadline ?? null,
    productCount: countMap[s.id] ?? 0,
  }))

  return NextResponse.json({ suppliers: result })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json() as PatchBody
  if (!body.id) {
    return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: current, error: fetchErr } = await admin
    .from('suppliers')
    .select('orders_open, order_deadline')
    .eq('id', body.id)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: fetchErr?.message ?? 'Fournisseur introuvable.' }, { status: 404 })
  }

  const nextOrdersOpen = body.orders_open ?? current.orders_open ?? false
  const nextDeadline = body.order_deadline !== undefined
    ? body.order_deadline
    : current.order_deadline

  if (body.active !== undefined && typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Paramètre active invalide.' }, { status: 400 })
  }
  if (body.orders_open !== undefined && typeof body.orders_open !== 'boolean') {
    return NextResponse.json({ error: 'Paramètre orders_open invalide.' }, { status: 400 })
  }

  if (nextOrdersOpen && !nextDeadline) {
    return NextResponse.json(
      { error: 'Un délai max de commande est obligatoire pour ouvrir les commandes.' },
      { status: 400 },
    )
  }

  if (nextDeadline) {
    const deadlineMs = new Date(nextDeadline).getTime()
    if (Number.isNaN(deadlineMs)) {
      return NextResponse.json({ error: 'Délai de commande invalide.' }, { status: 400 })
    }
    if (nextOrdersOpen && deadlineMs <= Date.now()) {
      return NextResponse.json(
        { error: 'Le délai doit être dans le futur pour ouvrir les commandes.' },
        { status: 400 },
      )
    }
  }

  const update: Record<string, unknown> = {}
  if (body.active !== undefined) update.active = body.active
  if (body.orders_open !== undefined) update.orders_open = body.orders_open
  if (body.order_deadline !== undefined) update.order_deadline = body.order_deadline

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const { error } = await admin
    .from('suppliers')
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

  const { data: productRows } = await admin
    .from('products')
    .select('id')
    .eq('supplier_id', id)

  const productIds = (productRows ?? []).map(p => p.id)

  const { data: linkedRows } = productIds.length > 0
    ? await admin.from('order_items').select('product_id').in('product_id', productIds)
    : { data: [] }

  const linkedIds = new Set((linkedRows ?? []).map(r => r.product_id))
  const freeIds = productIds.filter(pid => !linkedIds.has(pid))

  if (freeIds.length > 0) {
    await admin.from('products').delete().in('id', freeIds)
  }

  if (linkedIds.size > 0) {
    await admin.from('products').update({ active: false }).in('id', [...linkedIds])
  }

  if (linkedIds.size === 0) {
    const { error: sErr } = await admin.from('suppliers').delete().eq('id', id)
    if (sErr) {
      return NextResponse.json(
        { error: `Impossible de supprimer le fournisseur : ${sErr.message}` },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true, deleted: true })
  }

  await admin.from('suppliers').update({ active: false }).eq('id', id)
  return NextResponse.json({
    success: true,
    deleted: false,
    warning: `${linkedIds.size} produit(s) lié(s) à des commandes ont été désactivés (non supprimés). Le fournisseur a été masqué du catalogue.`,
  })
}
