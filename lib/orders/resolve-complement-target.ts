import type { SupabaseClient } from '@supabase/supabase-js'
import { ORDER_STATUS } from '@/lib/orders/lifecycle'

/** Trouve ou crée la commande « livrée » cible pour un ajout en mode complément. */
export async function resolveComplementTargetOrder(
  admin: SupabaseClient,
  params: {
    contextOrderId: string
    productSupplierId: string
    memberId: string
  },
): Promise<{ orderId: string; sameSupplierAsContext: boolean; created: boolean }> {
  const { contextOrderId, productSupplierId, memberId } = params

  const { data: contextOrder, error: ctxErr } = await admin
    .from('orders')
    .select('id, supplier_id, member_id, status')
    .eq('id', contextOrderId)
    .single()

  if (ctxErr || !contextOrder) {
    throw new Error('Commande introuvable.')
  }

  if (contextOrder.member_id !== memberId) {
    throw new Error('Commande introuvable.')
  }

  if (contextOrder.status !== ORDER_STATUS.delivered) {
    throw new Error('Seules les commandes « Livrées » peuvent être complétées.')
  }

  if (contextOrder.supplier_id === productSupplierId) {
    return { orderId: contextOrderId, sameSupplierAsContext: true, created: false }
  }

  const { data: existing } = await admin
    .from('orders')
    .select('id')
    .eq('member_id', memberId)
    .eq('supplier_id', productSupplierId)
    .eq('status', ORDER_STATUS.delivered)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { orderId: existing.id as string, sameSupplierAsContext: false, created: false }
  }

  const { data: created, error: insErr } = await admin
    .from('orders')
    .insert({
      member_id: memberId,
      supplier_id: productSupplierId,
      status: ORDER_STATUS.delivered,
      total: 0,
      credit_applied: 0,
      created_via_complement: true,
    })
    .select('id')
    .single()

  if (insErr || !created) {
    throw new Error(insErr?.message ?? 'Impossible de créer la commande complément.')
  }

  return { orderId: created.id as string, sameSupplierAsContext: false, created: true }
}
