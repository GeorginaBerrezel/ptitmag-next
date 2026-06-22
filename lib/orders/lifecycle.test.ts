import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  adminOrdersModeAllowsItemRemoval,
  canAdminRemoveOrderItem,
  orderIsModifiable,
} from '@/lib/orders/lifecycle'

describe('orderIsModifiable', () => {
  it('autorise confirmed et delivered', () => {
    assert.equal(orderIsModifiable('confirmed'), true)
    assert.equal(orderIsModifiable('delivered'), true)
  })

  it('refuse closed et cancelled', () => {
    assert.equal(orderIsModifiable('closed'), false)
    assert.equal(orderIsModifiable('cancelled'), false)
  })
})

describe('adminOrdersModeAllowsItemRemoval', () => {
  it('autorise action et toClose', () => {
    assert.equal(adminOrdersModeAllowsItemRemoval('action'), true)
    assert.equal(adminOrdersModeAllowsItemRemoval('toClose'), true)
  })

  it('refuse closed et history', () => {
    assert.equal(adminOrdersModeAllowsItemRemoval('closed'), false)
    assert.equal(adminOrdersModeAllowsItemRemoval('history'), false)
  })
})

describe('canAdminRemoveOrderItem', () => {
  it('autorise action + confirmed et toClose + delivered', () => {
    assert.equal(canAdminRemoveOrderItem('action', 'confirmed'), true)
    assert.equal(canAdminRemoveOrderItem('toClose', 'delivered'), true)
  })

  it('refuse history même si commande modifiable', () => {
    assert.equal(canAdminRemoveOrderItem('history', 'confirmed'), false)
    assert.equal(canAdminRemoveOrderItem('history', 'delivered'), false)
  })

  it('refuse closed même en action/toClose', () => {
    assert.equal(canAdminRemoveOrderItem('action', 'closed'), false)
    assert.equal(canAdminRemoveOrderItem('toClose', 'closed'), false)
    assert.equal(canAdminRemoveOrderItem('closed', 'delivered'), false)
  })
})
