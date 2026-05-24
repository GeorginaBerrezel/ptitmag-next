import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'

// ─── GET — liste des fournisseurs avec nombre de produits ─────────────────────

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const admin = createAdminClient()

  const { data: suppliers, error: sErr } = await admin
    .from('suppliers')
    .select('id, name, type, active')
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

  const { data: deadlines } = await admin
    .from('products')
    .select('supplier_id, order_deadline')
    .not('order_deadline', 'is', null)
    .order('order_deadline', { ascending: false })

  const deadlineMap: Record<string, string> = {}
  for (const p of deadlines ?? []) {
    if (!deadlineMap[p.supplier_id]) {
      deadlineMap[p.supplier_id] = p.order_deadline!
    }
  }

  const result = (suppliers ?? []).map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    active: s.active ?? true,
    productCount: countMap[s.id] ?? 0,
    lastDeadline: deadlineMap[s.id] ?? null,
  }))

  return NextResponse.json({ suppliers: result })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json() as { id?: string; active?: boolean }
  if (!body.id || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('suppliers')
    .update({ active: body.active })
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
