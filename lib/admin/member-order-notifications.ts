import type { SupabaseClient } from '@supabase/supabase-js'
import type { DeliveryItem } from '@/lib/email/sendDeliveryNotification'
import type { OrderLineForEmail } from '@/lib/orders/close-order'
import { ORDER_STATUS } from '@/lib/orders/lifecycle'

export type MemberProfile = {
  email: string
  full_name: string | null
  username: string | null
}

export type MemberDeliveredOrder = {
  id: string
  total: number
  supplierName: string
  items: DeliveryItem[]
}

export type MemberClosedOrderGroup = {
  supplierName: string
  items: OrderLineForEmail[]
  grossTotal: number
  creditApplied: number
  total: number
}

const ORDER_SELECT = `
  id, status, total, member_id,
  supplier:suppliers(name),
  order_items(
    quantity, unit_price, cancelled_at,
    product:products(name, unit)
  )
`

type RawOrderItem = {
  quantity: number
  unit_price: number
  cancelled_at: string | null
  product: { name: string; unit: string } | null
}

function mapActiveItems(rawItems: RawOrderItem[] | null | undefined): OrderLineForEmail[] {
  return (rawItems ?? [])
    .filter(i => !i.cancelled_at)
    .map(row => ({
      productName: row.product?.name ?? '—',
      quantity: row.quantity,
      unit: row.product?.unit ?? '',
      unitPrice: row.unit_price,
    }))
}

export async function fetchMemberProfile(
  admin: SupabaseClient,
  memberId: string,
): Promise<MemberProfile | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name, username')
    .eq('id', memberId)
    .single()

  let email = (profile?.email as string | null)?.trim() || null
  if (!email) {
    const { data: authUser } = await admin.auth.admin.getUserById(memberId)
    email = authUser?.user?.email?.trim() || null
  }
  if (!email) return null

  return {
    email,
    full_name: (profile?.full_name as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
  }
}

export function memberDisplayName(profile: MemberProfile): string | null {
  return profile.full_name || profile.username || null
}

export async function fetchMemberDeliveredOrders(
  admin: SupabaseClient,
  memberId: string,
): Promise<MemberDeliveredOrder[]> {
  const { data: orders, error } = await admin
    .from('orders')
    .select(ORDER_SELECT)
    .eq('member_id', memberId)
    .eq('status', ORDER_STATUS.delivered)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return (orders ?? [])
    .map(order => {
      const items = mapActiveItems(order.order_items as unknown as RawOrderItem[] | null)
      if (items.length === 0) return null
      return {
        id: order.id as string,
        total: Number(order.total) || 0,
        supplierName:
          (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur',
        items,
      }
    })
    .filter((o): o is MemberDeliveredOrder => o != null)
}
