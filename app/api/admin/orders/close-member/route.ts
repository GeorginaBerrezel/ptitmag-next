import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  fetchMemberProfile,
  memberDisplayName,
} from '@/lib/admin/member-order-notifications'
import { sendOrderClosed } from '@/lib/email/sendOrderClosed'
import { closeMemberOrders } from '@/lib/orders/close-member-orders'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const memberId = (body.memberId as string | undefined)?.trim()
  if (!memberId) {
    return NextResponse.json({ error: 'memberId manquant.' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const profile = await fetchMemberProfile(admin, memberId)
    if (!profile) {
      return NextResponse.json({ error: 'Profil membre introuvable.' }, { status: 400 })
    }

    const { closedGroups, globalGrossTotal, globalCreditApplied, globalTotal } =
      await closeMemberOrders(admin, memberId)

    const ordersResponse = closedGroups.map(g => ({
      orderId: g.orderId,
      supplierName: g.supplierName,
      items: g.items,
      grossTotal: g.grossTotal,
      creditApplied: g.creditApplied,
      total: g.total,
    }))

    let emailSent = false
    if (profile.email) {
      try {
        await sendOrderClosed({
          memberEmail: profile.email,
          memberName: memberDisplayName(profile),
          orders: ordersResponse.map(g => ({
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
        console.error('[admin/orders/close-member] Email failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      closedCount: closedGroups.length,
      orders: ordersResponse,
      globalGrossTotal,
      globalCreditApplied,
      globalTotal,
      emailSent,
      message: emailSent
        ? `${closedGroups.length} commande${closedGroups.length > 1 ? 's' : ''} clôturée${closedGroups.length > 1 ? 's' : ''} — total CHF ${globalTotal.toFixed(2)}. Email envoyé.`
        : `${closedGroups.length} commande${closedGroups.length > 1 ? 's' : ''} clôturée${closedGroups.length > 1 ? 's' : ''} — total CHF ${globalTotal.toFixed(2)}. Email non envoyé.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
