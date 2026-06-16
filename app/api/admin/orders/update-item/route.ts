import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { resetOrderItemAtClosure, updateOrderItemAtClosure } from '@/lib/orders/update-item'
import { NextResponse, type NextRequest } from 'next/server'

type UpdateItemBody = {
  orderItemId?: string
  quantity?: number
  unitPrice?: number
  reset?: boolean
}

/**
 * PATCH /api/admin/orders/update-item
 * Modifie qté / prix ou rétablit la ligne livrée (À clôturer).
 */
export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = (await request.json()) as UpdateItemBody
  const orderItemId = body.orderItemId?.trim()
  if (!orderItemId) {
    return NextResponse.json({ error: 'Paramètre orderItemId manquant.' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const result = body.reset
      ? await resetOrderItemAtClosure(admin, orderItemId)
      : await updateOrderItemAtClosure(admin, orderItemId, {
          quantity: body.quantity,
          unitPrice: body.unitPrice,
        })

    return NextResponse.json({
      success: true,
      ...result,
      message: body.reset
        ? `Ligne rétablie — total commande CHF ${result.newTotal.toFixed(2)}.`
        : `Ligne mise à jour — total commande CHF ${result.newTotal.toFixed(2)}.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    const status = message.includes('introuvable') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
