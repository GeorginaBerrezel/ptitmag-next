import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeNextCreditBalance,
  creditEventTitle,
} from '@/lib/members/credit-ledger'

describe('computeNextCreditBalance', () => {
  it('ajoute un dépôt', () => {
    assert.equal(computeNextCreditBalance(10, 20), 30)
  })

  it('refuse un retrait plus grand que le solde', () => {
    assert.equal(computeNextCreditBalance(10, -20), null)
  })

  it('autorise un retrait exact à zéro', () => {
    assert.equal(computeNextCreditBalance(15, -15), 0)
  })
})

describe('creditEventTitle', () => {
  it('nomme clairement dépôt et clôture', () => {
    assert.equal(creditEventTitle('deposit'), 'Dépôt au magasin')
    assert.equal(creditEventTitle('order_close'), 'Avoir utilisé (commande clôturée)')
  })
})
