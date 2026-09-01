import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterLatestClosedBatch, zurichCalendarDay } from '@/lib/admin/member-order-notifications'

describe('filterLatestClosedBatch', () => {
  it('garde uniquement les commandes du dernier jour Zurich', () => {
    const orders = [
      { id: 'old', closed_at: '2026-08-01T10:00:00.000Z' },
      { id: 'a', closed_at: '2026-08-30T08:00:00.000Z' },
      { id: 'b', closed_at: '2026-08-30T16:30:00.000Z' },
    ]
    assert.deepEqual(
      filterLatestClosedBatch(orders).map(o => o.id),
      ['a', 'b'],
    )
  })

  it('retourne vide si aucune commande', () => {
    assert.deepEqual(filterLatestClosedBatch([]), [])
  })
})

describe('zurichCalendarDay', () => {
  it('formate YYYY-MM-DD', () => {
    assert.equal(zurichCalendarDay('2026-08-30T16:30:00.000Z'), '2026-08-30')
  })
})
