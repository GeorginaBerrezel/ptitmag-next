import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'
import { ORDER_STATUS, orderIsModifiable } from '@/lib/orders/lifecycle'
import { syncOrderGrossTotal } from '@/lib/orders/totals'

export type UpdateOrderItemInput = {
  quantity?: number
  unitPrice?: number
}

export type UpdateOrderItemResult = {
  orderId: string
  itemId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  newTotal: number
  closureBaselineQuantity: number | null
  closureBaselineUnitPrice: number | null
}

type OrderItemRow = {
  id: string
  quantity: number
  unit_price: number
  cancelled_at: string | null
  closure_baseline_quantity: number | null
  closure_baseline_unit_price: number | null
  order: { id: string; status: string } | null
}

const ORDER_ITEM_SELECT = `
  id, quantity, unit_price, cancelled_at,
  closure_baseline_quantity, closure_baseline_unit_price,
  order:orders(id, status)
`

export function parseClosureEditQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (Number.isNaN(n) || n <= 0) return null
  return roundChf(n)
}

export function parseClosureEditUnitPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (Number.isNaN(n) || n < 0) return null
  return roundChf(n)
}

async function fetchModifiableItem(
  admin: SupabaseClient,
  orderItemId: string,
): Promise<OrderItemRow> {
  const { data: item, error: itemErr } = await admin
    .from('order_items')
    .select(ORDER_ITEM_SELECT)
    .eq('id', orderItemId)
    .single()

  if (itemErr || !item) {
    throw new Error('Ligne de commande introuvable.')
  }

  const row = item as unknown as OrderItemRow

  if (row.cancelled_at) {
    throw new Error('Cette ligne a été retirée.')
  }

  const order = row.order
  if (!order) {
    throw new Error('Commande introuvable.')
  }

  if (!orderIsModifiable(order.status)) {
    throw new Error('Cette commande ne peut plus être modifiée (clôturée ou annulée).')
  }

  if (order.status !== ORDER_STATUS.delivered) {
    throw new Error('Modification possible uniquement sur une commande « Livrée » (À clôturer).')
  }

  return row
}

function buildResult(
  orderId: string,
  itemId: string,
  quantity: number,
  unitPrice: number,
  newTotal: number,
  baselineQty: number | null,
  baselinePrice: number | null,
): UpdateOrderItemResult {
  return {
    orderId,
    itemId,
    quantity,
    unitPrice,
    lineTotal: roundChf(quantity * unitPrice),
    newTotal,
    closureBaselineQuantity: baselineQty,
    closureBaselineUnitPrice: baselinePrice,
  }
}

/**
 * Modifie quantité et/ou prix unitaire d'une ligne — commande « Livrée » uniquement (À clôturer).
 * Au 1er edit, snapshot des valeurs livrées dans closure_baseline_* (rétablir).
 */
export async function updateOrderItemAtClosure(
  admin: SupabaseClient,
  orderItemId: string,
  input: UpdateOrderItemInput,
): Promise<UpdateOrderItemResult> {
  const hasQuantity = input.quantity !== undefined
  const hasUnitPrice = input.unitPrice !== undefined

  if (!hasQuantity && !hasUnitPrice) {
    throw new Error('Indiquez une quantité ou un prix unitaire à modifier.')
  }

  const quantity = hasQuantity ? parseClosureEditQuantity(input.quantity) : null
  const unitPrice = hasUnitPrice ? parseClosureEditUnitPrice(input.unitPrice) : null

  if (hasQuantity && quantity === null) {
    throw new Error('Quantité invalide — doit être supérieure à 0.')
  }
  if (hasUnitPrice && unitPrice === null) {
    throw new Error('Prix unitaire invalide — doit être ≥ 0.')
  }

  const item = await fetchModifiableItem(admin, orderItemId)
  const order = item.order!

  const currentQty = item.quantity
  const currentPrice = item.unit_price
  const nextQuantity = quantity ?? currentQty
  const nextUnitPrice = unitPrice ?? currentPrice

  const storedBaselineQty = item.closure_baseline_quantity
  const storedBaselinePrice = item.closure_baseline_unit_price
  const baselineQty =
    storedBaselineQty != null ? roundChf(Number(storedBaselineQty)) : null
  const baselinePrice =
    storedBaselinePrice != null ? roundChf(Number(storedBaselinePrice)) : null

  if (nextQuantity === currentQty && nextUnitPrice === currentPrice) {
    const { data: currentOrder } = await admin
      .from('orders')
      .select('total')
      .eq('id', order.id)
      .single()

    return buildResult(
      order.id,
      orderItemId,
      nextQuantity,
      nextUnitPrice,
      roundChf(Number(currentOrder?.total) || roundChf(nextQuantity * nextUnitPrice)),
      baselineQty,
      baselinePrice,
    )
  }

  const updatePayload: Record<string, number> = {
    quantity: nextQuantity,
    unit_price: nextUnitPrice,
  }

  if (baselineQty == null && baselinePrice == null) {
    updatePayload.closure_baseline_quantity = currentQty
    updatePayload.closure_baseline_unit_price = currentPrice
  }

  const { error: updErr } = await admin
    .from('order_items')
    .update(updatePayload)
    .eq('id', orderItemId)

  if (updErr) {
    throw new Error(updErr.message)
  }

  const newTotal = await syncOrderGrossTotal(admin, order.id)

  return buildResult(
    order.id,
    orderItemId,
    nextQuantity,
    nextUnitPrice,
    newTotal,
    baselineQty ?? currentQty,
    baselinePrice ?? currentPrice,
  )
}

/** Rétablit qté et prix du snapshot « commande livrée » (1er edit admin). */
export async function resetOrderItemAtClosure(
  admin: SupabaseClient,
  orderItemId: string,
): Promise<UpdateOrderItemResult> {
  const item = await fetchModifiableItem(admin, orderItemId)
  const order = item.order!

  if (item.closure_baseline_quantity == null || item.closure_baseline_unit_price == null) {
    throw new Error('Cette ligne n\'a pas encore été modifiée à la clôture.')
  }

  const baselineQty = roundChf(Number(item.closure_baseline_quantity))
  const baselinePrice = roundChf(Number(item.closure_baseline_unit_price))

  if (item.quantity === baselineQty && item.unit_price === baselinePrice) {
    const { data: currentOrder } = await admin
      .from('orders')
      .select('total')
      .eq('id', order.id)
      .single()

    return buildResult(
      order.id,
      orderItemId,
      baselineQty,
      baselinePrice,
      roundChf(Number(currentOrder?.total) || roundChf(baselineQty * baselinePrice)),
      baselineQty,
      baselinePrice,
    )
  }

  const { error: updErr } = await admin
    .from('order_items')
    .update({
      quantity: baselineQty,
      unit_price: baselinePrice,
    })
    .eq('id', orderItemId)

  if (updErr) {
    throw new Error(updErr.message)
  }

  const newTotal = await syncOrderGrossTotal(admin, order.id)

  return buildResult(
    order.id,
    orderItemId,
    baselineQty,
    baselinePrice,
    newTotal,
    baselineQty,
    baselinePrice,
  )
}
