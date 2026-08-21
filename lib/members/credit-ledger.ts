import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'

/** Date à partir de laquelle les dépôts sont enregistrés ligne par ligne. */
export const CREDIT_LEDGER_STARTED_ON = '21 août 2026'

export const CREDIT_EVENT_KINDS = [
  'deposit',
  'adjustment',
  'order_close',
  'order_restore',
] as const

export type CreditEventKind = (typeof CREDIT_EVENT_KINDS)[number]

export type CreditEvent = {
  id: string
  member_id: string
  amount: number
  balance_after: number
  kind: CreditEventKind
  note: string | null
  order_id: string | null
  created_at: string
}

export function computeNextCreditBalance(current: number, delta: number): number | null {
  const next = roundChf((Number(current) || 0) + delta)
  if (next < 0) return null
  return next
}

export function creditEventTitle(kind: CreditEventKind): string {
  if (kind === 'deposit') return 'Dépôt au magasin'
  if (kind === 'adjustment') return 'Correction'
  if (kind === 'order_close') return 'Avoir utilisé (commande clôturée)'
  return 'Avoir recrédité (commande annulée)'
}

function isMissingLedgerTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('member_credit_events')
  )
}

export async function insertCreditEvent(
  admin: SupabaseClient,
  params: {
    memberId: string
    amount: number
    balanceAfter: number
    kind: CreditEventKind
    note?: string | null
    orderId?: string | null
    createdBy?: string | null
  },
): Promise<CreditEvent | null> {
  const { data, error } = await admin
    .from('member_credit_events')
    .insert({
      member_id: params.memberId,
      amount: roundChf(params.amount),
      balance_after: roundChf(params.balanceAfter),
      kind: params.kind,
      note: params.note?.trim() || null,
      order_id: params.orderId ?? null,
      created_by: params.createdBy ?? null,
    })
    .select('id, member_id, amount, balance_after, kind, note, order_id, created_at')
    .single()

  if (error) {
    if (isMissingLedgerTable(error)) {
      console.warn('[credit-ledger] table absente — solde mis à jour sans ligne de carnet.')
      return null
    }
    throw new Error(error.message)
  }

  const row = data as CreditEvent
  return {
    ...row,
    amount: roundChf(Number(row.amount)),
    balance_after: roundChf(Number(row.balance_after)),
  }
}

/** Met à jour le solde puis ajoute une ligne de carnet. */
export async function applyCreditDelta(
  admin: SupabaseClient,
  params: {
    memberId: string
    delta: number
    kind: CreditEventKind
    note?: string | null
    orderId?: string | null
    createdBy?: string | null
  },
): Promise<{ balanceAfter: number; event: CreditEvent | null }> {
  const delta = roundChf(params.delta)
  if (delta === 0) {
    throw new Error('Montant nul.')
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('credit_balance')
    .eq('id', params.memberId)
    .single()

  if (error || !profile) {
    throw new Error('Profil membre introuvable.')
  }

  const current = roundChf(Number(profile.credit_balance) || 0)
  const balanceAfter = computeNextCreditBalance(current, delta)
  if (balanceAfter === null) {
    throw new Error(`Solde insuffisant (actuel CHF ${current.toFixed(2)}).`)
  }

  const { error: updErr } = await admin
    .from('profiles')
    .update({ credit_balance: balanceAfter })
    .eq('id', params.memberId)

  if (updErr) throw new Error(updErr.message)

  const event = await insertCreditEvent(admin, {
    memberId: params.memberId,
    amount: delta,
    balanceAfter,
    kind: params.kind,
    note: params.note,
    orderId: params.orderId,
    createdBy: params.createdBy,
  })

  return { balanceAfter, event }
}

export async function listCreditEventsForMembers(
  admin: SupabaseClient,
  limitPerMember = 8,
): Promise<Record<string, CreditEvent[]>> {
  const { data, error } = await admin
    .from('member_credit_events')
    .select('id, member_id, amount, balance_after, kind, note, order_id, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    if (isMissingLedgerTable(error)) return {}
    console.error('[credit-ledger] list error:', error.message)
    return {}
  }

  const byMember: Record<string, CreditEvent[]> = {}
  for (const raw of data ?? []) {
    const row = raw as CreditEvent
    const id = row.member_id
    if (!byMember[id]) byMember[id] = []
    if (byMember[id].length >= limitPerMember) continue
    byMember[id].push({
      ...row,
      amount: roundChf(Number(row.amount)),
      balance_after: roundChf(Number(row.balance_after)),
    })
  }
  return byMember
}
