import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { addProductToOrder } from '@/lib/orders/add-line'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const orderId = (body.orderId as string | undefined)?.trim()
  const productId = (body.productId as string | undefined)?.trim()
  const quantity = Number(body.quantity) || 1

  if (!orderId || !productId) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('member_id')
    .eq('id', orderId)
    .single()

  if (!order?.member_id) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  try {
    const { newTotal, productName } = await addProductToOrder(admin, {
      orderId,
      productId,
      quantity,
      memberIdForPricing: order.member_id as string,
    })

    return NextResponse.json({
      success: true,
      newTotal,
      message: `« ${productName} » ajouté — total provisoire CHF ${newTotal.toFixed(2)}.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
