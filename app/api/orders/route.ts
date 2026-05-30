import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { CartItem } from '@/lib/cart/CartContext'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { applyCielMarkup, canAccessCatalog } from '@/lib/members/profile'
import { normalizeQuantity } from '@/lib/catalog/quantity-rules'
import { sendOrderConfirmation, type OrderEmailGroup } from '@/lib/email/sendOrderConfirmation'
import { supplierOrdersOpenAt } from '@/lib/catalog/supplier-orders'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Vérification de la session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const body = await request.json()
  const items: CartItem[] = body.items ?? []

  if (items.length === 0) {
    return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 })
  }

  // Récupérer le prénom/nom depuis le profil pour personnaliser l'email
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, status, cotisation_amount, cotisation_active')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessCatalog(profile)) {
    return NextResponse.json(
      { error: 'Accès catalogue réservé aux membres validés par Joel.' },
      { status: 403 },
    )
  }

  const applyCielMarkupFlag = applyCielMarkup(profile)

  const memberName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    null

  // Grouper les articles par fournisseur
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

  const createdOrders: string[] = []
  const emailGroups: OrderEmailGroup[] = []

  for (const [supplierId, supplierItems] of Object.entries(bySupplier)) {
    const normalizedItems = supplierItems.map(item => {
      const quantity = normalizeQuantity(item.quantity, {
        minQuantity: item.minQuantity,
        allowsPartialOrder: item.allowsPartialOrder,
      })
      const unitPrice = getEffectiveUnitPrice({ ...item, quantity }, { applyCielMarkup: applyCielMarkupFlag })
      return { ...item, quantity, unitPrice }
    })

    const total = normalizedItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    )

    // Créer l'ordre pour ce fournisseur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        member_id: user.id,
        supplier_id: supplierId,
        status: 'confirmed',
        total: Math.round(total * 100) / 100,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: `Erreur lors de la création de la commande : ${orderError?.message}` },
        { status: 500 }
      )
    }

    // Créer les lignes de commande
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
      return NextResponse.json(
        { error: `Erreur lors de l'enregistrement des produits : ${itemsError.message}` },
        { status: 500 }
      )
    }

    createdOrders.push(order.id)

    // Préparer les données pour l'email
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
      total: Math.round(total * 100) / 100,
    })
  }

  // Envoyer l'email de confirmation (attendu avant la réponse pour Vercel serverless)
  const globalTotal = emailGroups.reduce((sum, g) => sum + g.total, 0)
  try {
    await sendOrderConfirmation({
      memberEmail: user.email!,
      memberName,
      orders: emailGroups,
      globalTotal: Math.round(globalTotal * 100) / 100,
    })
  } catch (err) {
    console.error('[email] Échec envoi confirmation commande :', err)
  }

  return NextResponse.json({
    success: true,
    orders: createdOrders,
    message: `${createdOrders.length} commande${createdOrders.length > 1 ? 's' : ''} créée${createdOrders.length > 1 ? 's' : ''} avec succès.`,
  })
}
