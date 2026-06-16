import type { SupabaseClient } from '@supabase/supabase-js'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { normalizeQuantity } from '@/lib/catalog/quantity-rules'
import { roundChf } from '@/lib/members/credit'
import { applyCielMarkup } from '@/lib/members/profile'
import { ORDER_STATUS, orderIsModifiable } from '@/lib/orders/lifecycle'
import { resolveComplementTargetOrder } from '@/lib/orders/resolve-complement-target'
import { syncOrderGrossTotal } from '@/lib/orders/totals'

type AddLineResult = {
  newTotal: number
  productName: string
  targetOrderId: string
  supplierName: string
  sameSupplierAsContext: boolean
  createdOrder: boolean
}

async function insertLineOnDeliveredOrder(
  admin: SupabaseClient,
  params: {
    orderId: string
    productId: string
    quantity: number
    memberIdForPricing: string
  },
): Promise<{ newTotal: number; productName: string; supplierName: string }> {
  const { orderId, productId, quantity: rawQty, memberIdForPricing } = params

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, supplier_id, member_id, supplier:suppliers(name)')
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
  const supplierName =
    (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur'

  return { newTotal, productName: product.name as string, supplierName }
}

/** Ajout direct sur une commande livrée (même fournisseur — admin). */
export async function addProductToOrder(
  admin: SupabaseClient,
  params: {
    orderId: string
    productId: string
    quantity: number
    memberIdForPricing: string
  },
): Promise<{ newTotal: number; productName: string }> {
  const result = await insertLineOnDeliveredOrder(admin, params)
  return { newTotal: result.newTotal, productName: result.productName }
}

export type ClosureAddLineResult = {
  newTotal: number
  productName: string
  unitPrice: number
  quantity: number
  unit: string
  targetOrderId: string
  supplierName: string
  sameSupplierAsContext: boolean
  createdOrder: boolean
}

/**
 * Ajout admin en « À clôturer » : catalogue entier, 1 unité, prix catalogue sans majoration.
 * Crée une commande livrée pour le fournisseur si besoin (comme complément membre).
 */
export async function addProductToOrderAtClosure(
  admin: SupabaseClient,
  params: {
    contextOrderId: string
    productId: string
    memberId: string
  },
): Promise<ClosureAddLineResult> {
  const { contextOrderId, productId, memberId } = params

  const { data: product, error: prodErr } = await admin
    .from('products')
    .select('id, name, unit, unit_price, supplier_id, active')
    .eq('id', productId)
    .single()

  if (prodErr || !product) {
    throw new Error('Produit introuvable.')
  }

  if (!product.active) {
    throw new Error('Ce produit n\'est plus disponible.')
  }

  if (product.unit_price == null) {
    throw new Error('Ce produit n\'a pas de prix.')
  }

  const target = await resolveComplementTargetOrder(admin, {
    contextOrderId,
    productSupplierId: product.supplier_id as string,
    memberId,
  })

  const { data: targetOrder, error: targetErr } = await admin
    .from('orders')
    .select('id, status, member_id')
    .eq('id', target.orderId)
    .single()

  if (targetErr || !targetOrder) {
    throw new Error('Commande cible introuvable.')
  }

  if (!orderIsModifiable(targetOrder.status as string)) {
    throw new Error('Cette commande ne peut plus être modifiée.')
  }

  if (targetOrder.status !== ORDER_STATUS.delivered) {
    throw new Error('Les ajouts sont possibles uniquement sur une commande « Livrée ».')
  }

  const quantity = 1
  const unitPrice = roundChf(Number(product.unit_price))

  const { error: insErr } = await admin.from('order_items').insert({
    order_id: target.orderId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
  })

  if (insErr) {
    throw new Error(insErr.message)
  }

  const newTotal = await syncOrderGrossTotal(admin, target.orderId)

  const { data: orderWithSupplier } = await admin
    .from('orders')
    .select('supplier:suppliers(name)')
    .eq('id', target.orderId)
    .single()

  const supplierName =
    (orderWithSupplier?.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur'

  return {
    newTotal,
    productName: product.name as string,
    unitPrice,
    quantity,
    unit: (product.unit as string) ?? '',
    targetOrderId: target.orderId,
    supplierName,
    sameSupplierAsContext: target.sameSupplierAsContext,
    createdOrder: target.created,
  }
}

/** Complément membre : peut cibler un autre fournisseur (commande livrée existante ou nouvelle). */
export async function addProductToOrderComplement(
  admin: SupabaseClient,
  params: {
    contextOrderId: string
    productId: string
    quantity: number
    memberIdForPricing: string
  },
): Promise<AddLineResult> {
  const { contextOrderId, productId, quantity, memberIdForPricing } = params

  const { data: product, error: prodErr } = await admin
    .from('products')
    .select('id, supplier_id, active')
    .eq('id', productId)
    .single()

  if (prodErr || !product) {
    throw new Error('Produit introuvable.')
  }

  if (!product.active) {
    throw new Error('Ce produit n\'est plus disponible.')
  }

  const target = await resolveComplementTargetOrder(admin, {
    contextOrderId,
    productSupplierId: product.supplier_id as string,
    memberId: memberIdForPricing,
  })

  const line = await insertLineOnDeliveredOrder(admin, {
    orderId: target.orderId,
    productId,
    quantity,
    memberIdForPricing,
  })

  return {
    ...line,
    targetOrderId: target.orderId,
    sameSupplierAsContext: target.sameSupplierAsContext,
    createdOrder: target.created,
  }
}
