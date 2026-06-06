import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { addProductToOrderComplement } from '@/lib/orders/add-line'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
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

  if (!order || order.member_id !== user.id) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  try {
    const result = await addProductToOrderComplement(admin, {
      contextOrderId: orderId,
      productId,
      quantity,
      memberIdForPricing: user.id,
    })

    let message = `« ${result.productName} » ajouté — nouveau total provisoire CHF ${result.newTotal.toFixed(2)}.`
    if (!result.sameSupplierAsContext) {
      message = `« ${result.productName} » ajouté à votre commande ${result.supplierName} — total provisoire CHF ${result.newTotal.toFixed(2)}.`
      if (result.createdOrder) {
        message += ' (nouvelle commande livrée pour ce fournisseur)'
      }
    }

    return NextResponse.json({
      success: true,
      newTotal: result.newTotal,
      targetOrderId: result.targetOrderId,
      supplierName: result.supplierName,
      message,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
