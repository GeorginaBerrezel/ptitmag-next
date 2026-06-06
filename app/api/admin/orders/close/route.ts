import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { closeOrder } from '@/lib/orders/close-order'
import { sendOrderClosed } from '@/lib/email/sendOrderClosed'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const orderId = (body.orderId as string | undefined)?.trim()
  if (!orderId) {
    return NextResponse.json({ error: 'orderId manquant.' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const result = await closeOrder(admin, orderId)

    let emailSent = false
    if (result.memberEmail) {
      try {
        await sendOrderClosed({
          memberEmail: result.memberEmail,
          memberName: result.memberName,
          supplierName: result.supplierName,
          items: result.items,
          grossTotal: result.grossTotal,
          creditApplied: result.creditApplied,
          total: result.total,
        })
        emailSent = true
      } catch (err) {
        console.error('[admin/orders/close] Email failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      grossTotal: result.grossTotal,
      creditApplied: result.creditApplied,
      total: result.total,
      emailSent,
      message: emailSent
        ? `Commande clôturée — total CHF ${result.total.toFixed(2)}${result.creditApplied > 0 ? ` (avoir −${result.creditApplied.toFixed(2)})` : ''}. Email envoyé.`
        : `Commande clôturée — total CHF ${result.total.toFixed(2)}. Email non envoyé.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
