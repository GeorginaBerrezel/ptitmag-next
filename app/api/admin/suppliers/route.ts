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

// ─── GET — liste des fournisseurs avec nombre de produits ─────────────────────

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const admin = createAdminClient()

  // Récupérer tous les fournisseurs
  const { data: suppliers, error: sErr } = await admin
    .from('suppliers')
    .select('id, name, type, active')
    .order('name')

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  // Compter les produits actifs par fournisseur
  const { data: counts, error: cErr } = await admin
    .from('products')
    .select('supplier_id')
    .eq('active', true)

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  // Construire un dictionnaire supplierId → count
  const countMap: Record<string, number> = {}
  for (const p of counts ?? []) {
    countMap[p.supplier_id] = (countMap[p.supplier_id] ?? 0) + 1
  }

  // Récupérer la date de dernier import (order_deadline max) par fournisseur
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

// ─── PATCH — basculer actif/inactif d'un fournisseur ─────────────────────────

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser()
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

// ─── DELETE — supprimer un fournisseur et tous ses produits ──────────────────

export async function DELETE(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const admin = createAdminClient()

  // Supprimer d'abord les produits (contrainte FK)
  const { error: pErr } = await admin
    .from('products')
    .delete()
    .eq('supplier_id', id)

  if (pErr) return NextResponse.json({ error: `Impossible de supprimer les produits : ${pErr.message}` }, { status: 500 })

  // Puis supprimer le fournisseur
  const { error: sErr } = await admin
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (sErr) return NextResponse.json({ error: `Impossible de supprimer le fournisseur : ${sErr.message}` }, { status: 500 })

  return NextResponse.json({ success: true })
}
