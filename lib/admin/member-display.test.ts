import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMonthSpan,
  groupOrdersByMember,
  isInClosureWeek,
  latestClosureWeekStart,
  zurichWeekStart,
} from '@/lib/admin/member-display'

describe('zurichWeekStart', () => {
  it('ramène un jeudi et le samedi suivant au même lundi', () => {
    assert.equal(zurichWeekStart('2026-09-24T10:00:00.000Z'), '2026-09-21')
    assert.equal(zurichWeekStart('2026-09-26T16:00:00.000Z'), '2026-09-21')
  })

  it('laisse la semaine d’avant à part', () => {
    assert.equal(zurichWeekStart('2026-09-17T10:00:00.000Z'), '2026-09-14')
  })
})

describe('latestClosureWeekStart', () => {
  it('garde la semaine du closed_at le plus récent', () => {
    const orders = [
      { created_at: '2026-06-20T10:00:00.000Z', closed_at: '2026-06-26T10:00:00.000Z' },
      { created_at: '2026-09-23T10:00:00.000Z', closed_at: '2026-09-26T10:00:00.000Z' },
    ]
    const week = latestClosureWeekStart(orders)
    assert.equal(week, '2026-09-21')
    assert.equal(isInClosureWeek(orders[1], week!), true)
    assert.equal(isInClosureWeek(orders[0], week!), false)
  })
})

describe('formatMonthSpan', () => {
  it('résume un seul mois ou une plage dans la même année', () => {
    assert.equal(formatMonthSpan(['2026-09-02T08:00:00.000Z']), 'sept. 2026')
    assert.equal(
      formatMonthSpan(['2026-09-02T08:00:00.000Z', '2026-06-20T08:00:00.000Z']),
      'juin → sept. 2026',
    )
  })
})

describe('groupOrdersByMember', () => {
  const name = () => 'Anaé'
  const email = () => null

  it('met la commande la plus récente en premier', () => {
    const groups = groupOrdersByMember(
      [
        { member_id: 'a', created_at: '2026-07-07T10:00:00.000Z', supplier: { name: 'Biopartner – Fruits & légumes' } },
        { member_id: 'a', created_at: '2026-09-02T10:00:00.000Z', supplier: { name: 'Biopartner – Général' } },
      ],
      name,
      email,
      'recent',
    )
    assert.deepEqual(
      groups[0].orders.map(order => order.created_at),
      ['2026-09-02T10:00:00.000Z', '2026-07-07T10:00:00.000Z'],
    )
  })

  it('garde le tri fournisseur pour la semaine en cours', () => {
    const groups = groupOrdersByMember(
      [
        { member_id: 'a', created_at: '2026-09-02T10:00:00.000Z', supplier: { name: 'Biopartner – Général' } },
        { member_id: 'a', created_at: '2026-07-07T10:00:00.000Z', supplier: { name: 'Biopartner – Fruits & légumes' } },
      ],
      name,
      email,
      'supplier',
    )
    assert.equal(groups[0].orders[0].supplier?.name, 'Biopartner – Fruits & légumes')
  })
})
