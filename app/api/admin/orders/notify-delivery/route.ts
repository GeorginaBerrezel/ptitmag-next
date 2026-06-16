import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  fetchMemberDeliveredOrders,
  fetchMemberProfile,
  memberDisplayName,
} from '@/lib/admin/member-order-notifications'
import { sendDeliveryNotification } from '@/lib/email/sendDeliveryNotification'
import { roundChf } from '@/lib/members/credit'
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
      return NextResponse.json({ error: 'Email membre introuvable.' }, { status: 400 })
    }

    const deliveredOrders = await fetchMemberDeliveredOrders(admin, memberId)
    if (deliveredOrders.length === 0) {
      return NextResponse.json(
        { error: 'Aucune commande livrée à notifier pour ce membre.' },
        { status: 400 },
      )
    }

    const emailOrders = deliveredOrders.map(o => ({
      supplierName: o.supplierName,
      items: o.items,
      total: o.total,
    }))
    const globalTotal = roundChf(emailOrders.reduce((sum, o) => sum + o.total, 0))

    let emailSent = false
    try {
      await sendDeliveryNotification({
        memberEmail: profile.email,
        memberName: memberDisplayName(profile),
        orders: emailOrders,
        globalTotal,
      })
      emailSent = true
    } catch (err) {
      console.error('[admin/orders/notify-delivery] Email failed:', err)
    }

    return NextResponse.json({
      success: true,
      orderCount: deliveredOrders.length,
      globalTotal,
      emailSent,
      message: emailSent
        ? `Email de retrait envoyé (${deliveredOrders.length} commande${deliveredOrders.length > 1 ? 's' : ''}).`
        : 'Email non envoyé (SMTP ou erreur).',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
