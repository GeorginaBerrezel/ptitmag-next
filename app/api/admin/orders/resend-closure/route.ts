import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  fetchMemberClosedOrdersForResend,
  fetchMemberProfile,
  memberDisplayName,
} from '@/lib/admin/member-order-notifications'
import { sendOrderClosed } from '@/lib/email/sendOrderClosed'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_ORDERS = 50

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json() as { memberId?: string; orderIds?: unknown }
  const memberId = body.memberId?.trim()
  if (!memberId) {
    return NextResponse.json({ error: 'memberId manquant.' }, { status: 400 })
  }

  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : undefined

  const admin = createAdminClient()

  try {
    const profile = await fetchMemberProfile(admin, memberId)
    if (!profile) {
      return NextResponse.json({ error: 'Email membre introuvable.' }, { status: 400 })
    }

    const closedOrders = await fetchMemberClosedOrdersForResend(admin, memberId, orderIds)
    if (closedOrders.length === 0) {
      return NextResponse.json(
        { error: 'Aucune commande clôturée à renvoyer pour ce membre.' },
        { status: 400 },
      )
    }
    if (closedOrders.length > MAX_ORDERS) {
      return NextResponse.json(
        { error: 'Trop de commandes pour un seul email. Filtre par date puis réessaie.' },
        { status: 400 },
      )
    }

    const globalGrossTotal = closedOrders.reduce((sum, o) => sum + o.grossTotal, 0)
    const globalCreditApplied = closedOrders.reduce((sum, o) => sum + o.creditApplied, 0)
    const globalTotal = closedOrders.reduce((sum, o) => sum + o.total, 0)

    let emailSent = false
    try {
      await sendOrderClosed({
        memberEmail: profile.email,
        memberName: memberDisplayName(profile),
        orders: closedOrders.map(g => ({
          supplierName: g.supplierName,
          items: g.items,
          grossTotal: g.grossTotal,
          creditApplied: g.creditApplied,
          total: g.total,
        })),
        globalGrossTotal,
        globalCreditApplied,
        globalTotal,
      })
      emailSent = true
    } catch (err) {
      console.error('[admin/orders/resend-closure] Email failed', {
        memberId,
        orderIds: closedOrders.map(g => g.orderId),
        orderCount: closedOrders.length,
        message: err instanceof Error ? err.message : String(err),
      })
    }

    return NextResponse.json({
      success: true,
      orderCount: closedOrders.length,
      globalTotal,
      emailSent,
      message: emailSent
        ? `Email de clôture renvoyé (${closedOrders.length} commande${closedOrders.length > 1 ? 's' : ''}).`
        : 'Email non envoyé (SMTP ou erreur).',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
