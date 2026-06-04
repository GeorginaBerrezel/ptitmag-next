import type { SupabaseClient } from '@supabase/supabase-js'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { normalizeQuantity } from '@/lib/catalog/quantity-rules'
import { applyCielMarkup } from '@/lib/members/profile'
import { ORDER_STATUS, orderIsModifiable } from '@/lib/orders/lifecycle'
import { syncOrderGrossTotal } from '@/lib/orders/totals'

export async function addProductToOrder(
  admin: SupabaseClient,
  params: {
    orderId: string
    productId: string
    quantity: number
    memberIdForPricing: string
  },
): Promise<{ newTotal: number; productName: string }> {
  const { orderId, productId, quantity: rawQty, memberIdForPricing } = params

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, supplier_id, member_id')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    throw new Error('Commande introuvable.')
  }

  if (!orderIsModifiable(order.status as string)) {
    throw new Error('Cette commande ne peut plus être modifiée (clôturée ou annulée).')
  }

  if (order.status !== ORDER_STATUS.delivered) {
    throw new Error('Les ajouts sont possibles uniquement sur une commande « Livrée ».')
  }

  const { data: product, error: prodErr } = await admin
    .from('products')
    .select('id, name, unit, unit_price, min_quantity, allows_partial_order, supplier_id, active')
    .eq('id', productId)
    .single()

  if (prodErr || !product) {
    throw new Error('Produit introuvable.')
  }

  if (!product.active) {
    throw new Error('Ce produit n\'est plus disponible.')
  }

  if (product.supplier_id !== order.supplier_id) {
    throw new Error('Ce produit n\'appartient pas au même fournisseur que la commande.')
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('status, cotisation_amount, cotisation_active')
    .eq('id', memberIdForPricing)
    .single()

  const applyMarkup = profile ? applyCielMarkup(profile) : false
  const qty = normalizeQuantity(rawQty, {
    minQuantity: Number(product.min_quantity) || 1,
    allowsPartialOrder: Boolean(product.allows_partial_order),
  })

  if (product.unit_price == null) {
    throw new Error('Ce produit n\'a pas de prix.')
  }

  const unitPrice = getEffectiveUnitPrice(
    {
      unitPrice: product.unit_price,
      minQuantity: Number(product.min_quantity) || 1,
      allowsPartialOrder: Boolean(product.allows_partial_order),
      quantity: qty,
    },
    { applyCielMarkup: applyMarkup },
  )

  const { error: insErr } = await admin.from('order_items').insert({
    order_id: orderId,
    product_id: productId,
    quantity: qty,
    unit_price: unitPrice,
  })

  if (insErr) {
    throw new Error(insErr.message)
  }

  const newTotal = await syncOrderGrossTotal(admin, orderId)

  return { newTotal, productName: product.name as string }
}
