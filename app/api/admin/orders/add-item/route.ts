import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { addProductToOrderAtClosure } from '@/lib/orders/add-line'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/admin/orders/add-item
 * Ajout produit admin en « À clôturer » — catalogue entier, 1 unité, sans majoration.
 * Body : { contextOrderId, productId, memberId }
 */
export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const contextOrderId = (body.contextOrderId as string | undefined)?.trim()
  const productId = (body.productId as string | undefined)?.trim()
  const memberId = (body.memberId as string | undefined)?.trim()

  if (!contextOrderId || !productId || !memberId) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: contextOrder } = await admin
    .from('orders')
    .select('member_id, status')
    .eq('id', contextOrderId)
    .single()

  if (!contextOrder || contextOrder.member_id !== memberId) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  try {
    const result = await addProductToOrderAtClosure(admin, {
      contextOrderId,
      productId,
      memberId,
    })

    let message = `« ${result.productName} » ajouté (1 ${result.unit}) — CHF ${result.unitPrice.toFixed(2)} / unité, sans majoration.`
    if (result.createdOrder) {
      message += ` Nouvelle commande livrée pour ${result.supplierName}.`
    } else if (!result.sameSupplierAsContext) {
      message += ` Ajouté à la commande ${result.supplierName}.`
    }
    message += ` Total provisoire CHF ${result.newTotal.toFixed(2)}.`

    return NextResponse.json({
      success: true,
      ...result,
      message,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
