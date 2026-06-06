import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { sendOrderItemCancelled } from '@/lib/email/sendOrderItemCancelled'
import { roundChf } from '@/lib/members/credit'
import { orderIsModifiable } from '@/lib/orders/lifecycle'
import { syncOrderGrossTotal } from '@/lib/orders/totals'
import { NextResponse, type NextRequest } from 'next/server'

type CancelItemBody = {
  orderItemId?: string
}

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = (await request.json()) as CancelItemBody
  const orderItemId = body.orderItemId?.trim()
  if (!orderItemId) {
    return NextResponse.json({ error: 'Paramètre orderItemId manquant.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: item, error: itemErr } = await admin
    .from('order_items')
    .select(`
      id, quantity, unit_price, cancelled_at, order_id,
      product:products(name, unit),
      order:orders(
        id, status, total, member_id, credit_applied,
        supplier:suppliers(name)
      )
    `)
    .eq('id', orderItemId)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Ligne de commande introuvable.' }, { status: 404 })
  }

  if (item.cancelled_at) {
    return NextResponse.json({ error: 'Ce produit a déjà été retiré.' }, { status: 400 })
  }

  const order = item.order as unknown as {
    id: string
    status: string
    total: number
    member_id: string
    credit_applied: number | null
    supplier: { name: string } | null
  }

  if (!orderIsModifiable(order.status)) {
    return NextResponse.json(
      { error: 'Cette commande ne peut plus être modifiée (clôturée ou annulée).' },
      { status: 400 },
    )
  }

  const product = item.product as unknown as { name: string; unit: string } | null
  const removedProductName = product?.name ?? 'Produit'
  const removedUnit = product?.unit ?? ''
  const removedLineTotal = item.quantity * item.unit_price
  const supplierName = order.supplier?.name ?? 'Fournisseur'

  const cancelledAt = new Date().toISOString()
  const { error: cancelErr } = await admin
    .from('order_items')
    .update({ cancelled_at: cancelledAt })
    .eq('id', orderItemId)

  if (cancelErr) {
    return NextResponse.json({ error: cancelErr.message }, { status: 500 })
  }

  const { data: activeItems, error: activeErr } = await admin
    .from('order_items')
    .select('quantity, unit_price, product:products(name, unit)')
    .eq('order_id', order.id)
    .is('cancelled_at', null)

  if (activeErr) {
    return NextResponse.json({ error: activeErr.message }, { status: 500 })
  }

  const remaining = (activeItems ?? []).map(row => {
    const p = row.product as unknown as { name: string; unit: string } | null
    return {
      productName: p?.name ?? '—',
      quantity: row.quantity as number,
      unit: p?.unit ?? '',
      unitPrice: row.unit_price as number,
    }
  })

  const orderFullyCancelled = remaining.length === 0
  const newStatus = orderFullyCancelled ? 'cancelled' : order.status
  const creditApplied = roundChf(Number(order.credit_applied) || 0)

  let newTotal: number
  try {
    newTotal = orderFullyCancelled
      ? 0
      : await syncOrderGrossTotal(admin, order.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur recalcul total.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error: orderErr } = await admin
    .from('orders')
    .update({
      total: newTotal,
      status: newStatus,
      ...(orderFullyCancelled ? { credit_applied: 0 } : {}),
    })
    .eq('id', order.id)

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 500 })
  }

  if (orderFullyCancelled && creditApplied > 0) {
    const { data: profile } = await admin
      .from('profiles')
      .select('credit_balance')
      .eq('id', order.member_id)
      .single()

    if (profile) {
      const restored = roundChf((Number(profile.credit_balance) || 0) + creditApplied)
      await admin
        .from('profiles')
        .update({ credit_balance: restored })
        .eq('id', order.member_id)
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name, username')
    .eq('id', order.member_id)
    .single()

  let memberEmail = (profile?.email as string | null)?.trim() || null
  if (!memberEmail) {
    const { data: authUser } = await admin.auth.admin.getUserById(order.member_id)
    memberEmail = authUser?.user?.email?.trim() || null
  }

  let emailSent = false
  if (memberEmail) {
    const memberName =
      (profile?.full_name as string | null) ||
      (profile?.username as string | null) ||
      null

    try {
      await sendOrderItemCancelled({
        memberEmail,
        memberName,
        supplierName,
        removedProductName,
        removedQuantity: item.quantity as number,
        removedUnit,
        removedLineTotal,
        remainingItems: remaining,
        newTotal,
        orderFullyCancelled,
      })
      emailSent = true
    } catch (err) {
      console.error('[admin/cancel-item] Email failed:', err)
    }
  } else {
    console.warn('[admin/cancel-item] Aucun email membre trouvé pour', order.member_id)
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    newTotal,
    orderStatus: newStatus,
    orderFullyCancelled,
    emailSent,
    removedItem: {
      id: orderItemId,
      productName: removedProductName,
      quantity: item.quantity,
      unit: removedUnit,
      lineTotal: removedLineTotal,
    },
    remainingItems: remaining,
    message: orderFullyCancelled
      ? emailSent
        ? 'Dernier produit retiré — commande annulée. Email envoyé au membre.'
        : 'Dernier produit retiré — commande annulée. Email non envoyé (adresse introuvable).'
      : emailSent
        ? 'Produit retiré — total recalculé. Email envoyé au membre.'
        : 'Produit retiré — total recalculé. Email non envoyé (adresse introuvable).',
  })
}
