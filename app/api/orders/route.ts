import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { CartItem } from '@/lib/cart/CartContext'

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

  // Grouper les articles par fournisseur
  const bySupplier = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = []
    acc[item.supplierId].push(item)
    return acc
  }, {})

  const createdOrders: string[] = []

  for (const [supplierId, supplierItems] of Object.entries(bySupplier)) {
    const total = supplierItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

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
    const orderItems = supplierItems.map(item => ({
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
  }

  return NextResponse.json({
    success: true,
    orders: createdOrders,
    message: `${createdOrders.length} commande${createdOrders.length > 1 ? 's' : ''} créée${createdOrders.length > 1 ? 's' : ''} avec succès.`,
  })
}
