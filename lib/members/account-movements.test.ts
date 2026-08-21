import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAccountStatement } from '@/lib/members/account-movements'
import { getAccountPreview } from '@/lib/members/account-preview'
import type { OrderWithItems } from '@/lib/supabase/auth'

function order(partial: Partial<OrderWithItems> & Pick<OrderWithItems, 'id' | 'status'>): OrderWithItems {
  return {
    total: 0,
    created_at: '2026-07-28T09:21:00.000Z',
    supplier: { id: 's1', name: 'Truffes au chocolat cru', type: 'local' },
    order_items: [
      {
        id: 'i1',
        quantity: 1,
        unit_price: 15,
        product: { id: 'p1', name: 'Moelleux', unit: 'pièce' },
      },
    ],
    ...partial,
  }
}

describe('buildAccountStatement', () => {
  it('liste un achat clôturé avec avoir et le nom affiché Vérène', () => {
    const statement = buildAccountStatement(
      [
        order({
          id: 'o1',
          status: 'closed',
          total: 10,
          credit_applied: 5,
          closed_at: '2026-08-01T10:00:00.000Z',
        }),
      ],
      20,
    )

    assert.equal(statement.creditBalance, 20)
    assert.equal(statement.closedCount, 1)
    assert.equal(statement.closedGross, 15)
    assert.equal(statement.closedCredit, 5)
    assert.equal(statement.closedPayable, 10)
    assert.equal(statement.movements[0]?.supplierLabel, 'Vérène Melchior')
    assert.equal(statement.movements[0]?.kind, 'achat')
    assert.equal(statement.movements[0]?.date, '2026-08-01T10:00:00.000Z')
  })

  it('sépare les commandes en cours (provisoires) des clôturées', () => {
    const statement = buildAccountStatement(
      [
        order({ id: 'o1', status: 'closed', total: 15, closed_at: '2026-08-01T10:00:00.000Z' }),
        order({ id: 'o2', status: 'delivered', created_at: '2026-08-10T09:00:00.000Z' }),
        order({ id: 'o3', status: 'cancelled', total: 8 }),
      ],
      0,
    )

    assert.equal(statement.closedCount, 1)
    assert.equal(statement.inProgressCount, 1)
    assert.equal(statement.inProgressGross, 15)
    assert.equal(statement.movements.length, 2)
    assert.equal(statement.movements.some(m => m.id === 'o3'), false)
  })
})

describe('aperçu fictif', () => {
  it('complet : avoir, dépôt au carnet et commande en cours', () => {
    const demo = getAccountPreview('complet')
    const statement = buildAccountStatement(demo.orders, demo.creditBalance)
    assert.equal(statement.creditBalance, 15)
    assert.equal(statement.inProgressCount, 1)
    assert.equal(demo.events.some(e => e.kind === 'deposit' && e.amount === 20), true)
    assert.equal(demo.events.some(e => e.kind === 'order_close' && e.amount === -5), true)
  })
})
