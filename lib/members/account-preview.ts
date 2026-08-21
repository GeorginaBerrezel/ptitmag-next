import type { CreditEvent } from '@/lib/members/credit-ledger'
import type { OrderWithItems } from '@/lib/supabase/auth'

export const ACCOUNT_PREVIEW_MODES = ['vide', 'avoir', 'encours', 'complet'] as const
export type AccountPreviewMode = (typeof ACCOUNT_PREVIEW_MODES)[number]

export function isAccountPreviewMode(value: string | undefined): value is AccountPreviewMode {
  return ACCOUNT_PREVIEW_MODES.includes(value as AccountPreviewMode)
}

function line(
  id: string,
  name: string,
  unitPrice: number,
  quantity = 1,
): OrderWithItems['order_items'][number] {
  return {
    id,
    quantity,
    unit_price: unitPrice,
    product: { id: `p-${id}`, name, unit: 'pièce' },
  }
}

function event(
  partial: Pick<CreditEvent, 'id' | 'amount' | 'balance_after' | 'kind' | 'created_at'> & Partial<CreditEvent>,
): CreditEvent {
  return {
    member_id: 'demo',
    note: null,
    order_id: null,
    ...partial,
  }
}

/** Données fictives — local uniquement, jamais écrites en base. */
export function getAccountPreview(mode: AccountPreviewMode): {
  label: string
  creditBalance: number
  orders: OrderWithItems[]
  events: CreditEvent[]
} {
  if (mode === 'vide') {
    return { label: 'Compte vide', creditBalance: 0, orders: [], events: [] }
  }

  if (mode === 'avoir') {
    return {
      label: 'Avec avoir (dépôt)',
      creditBalance: 27.25,
      orders: [],
      events: [
        event({
          id: 'e-dep',
          amount: 27.25,
          balance_after: 27.25,
          kind: 'deposit',
          note: 'Virement',
          created_at: '2026-08-10T10:00:00.000Z',
        }),
      ],
    }
  }

  if (mode === 'encours') {
    return {
      label: 'Commande en cours',
      creditBalance: 0,
      orders: [
        {
          id: 'demo-encours',
          status: 'delivered',
          total: 102.61,
          created_at: '2026-08-12T08:00:00.000Z',
          supplier: { id: 's-bio', name: 'Biopartner – Général', type: 'grossiste_bio' },
          order_items: [line('i-bio', 'Aliments pour chat', 68.7), line('i-pasta', 'Fusili', 10.35, 3)],
        },
      ],
      events: [],
    }
  }

  return {
    label: 'Avoir + dépôt + clôture + en cours',
    creditBalance: 15,
    orders: [
      {
        id: 'demo-open',
        status: 'delivered',
        total: 32.4,
        created_at: '2026-08-18T10:00:00.000Z',
        supplier: { id: 's-graines', name: "Graines d'Avenir", type: 'local' },
        order_items: [line('i-pain', 'Craquants noisettes', 15)],
      },
    ],
    events: [
      event({
        id: 'e1',
        amount: -5,
        balance_after: 15,
        kind: 'order_close',
        note: 'Vérène Melchior',
        created_at: '2026-08-04T16:00:00.000Z',
      }),
      event({
        id: 'e2',
        amount: 20,
        balance_after: 20,
        kind: 'deposit',
        note: 'Espèces',
        created_at: '2026-08-01T09:00:00.000Z',
      }),
    ],
  }
}
