import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import type { CartItem } from '@/lib/cart/CartContext'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { applyCielMarkup, canAccessCatalog } from '@/lib/members/profile'
import { normalizeQuantity } from '@/lib/catalog/quantity-rules'
import { allocateCreditAcrossTotals, roundChf } from '@/lib/members/credit'
import { sendOrderConfirmation, type OrderEmailGroup } from '@/lib/email/sendOrderConfirmation'
import { supplierOrdersOpenAt } from '@/lib/catalog/supplier-orders'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const body = await request.json()
  const items: CartItem[] = body.items ?? []

  if (items.length === 0) {
    return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, status, cotisation_amount, cotisation_active, credit_balance')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessCatalog(profile)) {
    return NextResponse.json(
      { error: 'Accès catalogue réservé aux membres validés par Joel.' },
      { status: 403 },
    )
  }

  const applyCielMarkupFlag = applyCielMarkup(profile)
  const creditAvailable = roundChf(Number(profile.credit_balance) || 0)

  const memberName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    null

  const bySupplier = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = []
    acc[item.supplierId].push(item)
    return acc
  }, {})

  const supplierIds = Object.keys(bySupplier)
  const { data: supplierRows, error: supplierErr } = await supabase
    .from('suppliers')
    .select('id, name, orders_open, order_deadline')
    .in('id', supplierIds)

  if (supplierErr) {
    return NextResponse.json({ error: supplierErr.message }, { status: 500 })
  }

  const supplierMap = new Map((supplierRows ?? []).map(s => [s.id as string, s]))
  const nowMs = Date.now()

  for (const supplierId of supplierIds) {
    const supplier = supplierMap.get(supplierId)
    if (!supplier || !supplierOrdersOpenAt(supplier, nowMs)) {
      const name = supplier?.name ?? bySupplier[supplierId]?.[0]?.supplierName ?? 'ce fournisseur'
      return NextResponse.json(
        { error: `Les commandes sont fermées pour ${name}.` },
        { status: 400 },
      )
    }
  }

  type PreparedSupplier = {
    supplierId: string
    supplierItems: CartItem[]
    normalizedItems: Array<CartItem & { unitPrice: number }>
    grossTotal: number
  }

  const prepared: PreparedSupplier[] = []

  for (const [supplierId, supplierItems] of Object.entries(bySupplier)) {
    const normalizedItems = supplierItems.map(item => {
      const quantity = normalizeQuantity(item.quantity, {
        minQuantity: item.minQuantity,
        allowsPartialOrder: item.allowsPartialOrder,
      })
      const unitPrice = getEffectiveUnitPrice({ ...item, quantity }, { applyCielMarkup: applyCielMarkupFlag })
      return { ...item, quantity, unitPrice }
    })

    const grossTotal = roundChf(
      normalizedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    )

    prepared.push({ supplierId, supplierItems, normalizedItems, grossTotal })
  }

  const creditAllocations = allocateCreditAcrossTotals(
    prepared.map(p => p.grossTotal),
    creditAvailable,
  )
  const totalCreditUsed = roundChf(creditAllocations.reduce((s, c) => s + c, 0))

  const admin = createAdminClient()
  const createdOrders: string[] = []
  const emailGroups: OrderEmailGroup[] = []

  try {
    for (let i = 0; i < prepared.length; i++) {
      const { supplierId, supplierItems, normalizedItems, grossTotal } = prepared[i]
      const creditApplied = creditAllocations[i] ?? 0
      const total = roundChf(grossTotal - creditApplied)

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          member_id: user.id,
          supplier_id: supplierId,
          status: 'confirmed',
          total,
          credit_applied: creditApplied,
        })
        .select('id')
        .single()

      if (orderError || !order) {
        throw new Error(`Erreur lors de la création de la commande : ${orderError?.message}`)
      }

      const orderItems = normalizedItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error(`Erreur lors de l'enregistrement des produits : ${itemsError.message}`)
      }

      createdOrders.push(order.id)

      emailGroups.push({
        orderId: order.id,
        supplierName: supplierItems[0].supplierName,
        supplierType: supplierItems[0].supplierType,
        items: normalizedItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
        total,
        creditApplied: creditApplied > 0 ? creditApplied : undefined,
        grossTotal: creditApplied > 0 ? grossTotal : undefined,
      })
    }

    if (totalCreditUsed > 0) {
      const newBalance = roundChf(creditAvailable - totalCreditUsed)
      const { error: creditErr } = await admin
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', user.id)

      if (creditErr) {
        throw new Error(`Erreur lors de la mise à jour de l'avoir : ${creditErr.message}`)
      }
    }
  } catch (err) {
    if (createdOrders.length > 0) {
      await admin.from('order_items').delete().in('order_id', createdOrders)
      await admin.from('orders').delete().in('id', createdOrders)
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const globalTotal = roundChf(emailGroups.reduce((sum, g) => sum + g.total, 0))

  try {
    await sendOrderConfirmation({
      memberEmail: user.email!,
      memberName,
      orders: emailGroups,
      globalTotal,
      creditUsed: totalCreditUsed > 0 ? totalCreditUsed : undefined,
    })
  } catch (err) {
    console.error('[email] Échec envoi confirmation commande :', err)
  }

  return NextResponse.json({
    success: true,
    orders: createdOrders,
    creditUsed: totalCreditUsed,
    message: `${createdOrders.length} commande${createdOrders.length > 1 ? 's' : ''} créée${createdOrders.length > 1 ? 's' : ''} avec succès.${
      totalCreditUsed > 0 ? ` Avoir appliqué : CHF ${totalCreditUsed.toFixed(2)}.` : ''
    }`,
  })
}
