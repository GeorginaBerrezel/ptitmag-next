'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  formatClosureBaselineLabel,
  orderItemClosureModified,
  orderItemHasClosureBaseline,
} from '@/lib/orders/closure-baseline'
import lineStyles from '@/components/orders/order-lines.module.css'

const SAVED_FEEDBACK_MS = 2000

type Props = {
  itemId: string
  orderId: string
  quantity: number
  unitPrice: number
  unit: string
  closureBaselineQuantity?: number | null
  closureBaselineUnitPrice?: number | null
  disabled?: boolean
  onUpdated: (patch: {
    orderId: string
    itemId: string
    quantity: number
    unitPrice: number
    newTotal: number
    closureBaselineQuantity: number | null
    closureBaselineUnitPrice: number | null
  }) => void
}

function formatInputNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export default function AdminClosureLineEdit({
  itemId,
  orderId,
  quantity,
  unitPrice,
  unit,
  closureBaselineQuantity = null,
  closureBaselineUnitPrice = null,
  disabled = false,
  onUpdated,
}: Props) {
  const qtyId = useId()
  const priceId = useId()
  const fieldsRef = useRef<HTMLDivElement>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [qtyValue, setQtyValue] = useState(formatInputNumber(quantity))
  const [priceValue, setPriceValue] = useState(unitPrice.toFixed(2))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baselineItem = {
    quantity,
    unit_price: unitPrice,
    closure_baseline_quantity: closureBaselineQuantity,
    closure_baseline_unit_price: closureBaselineUnitPrice,
  }
  const hasBaseline = orderItemHasClosureBaseline(baselineItem)
  const isModified = orderItemClosureModified(baselineItem)
  const baselineLabel =
    hasBaseline && closureBaselineQuantity != null && closureBaselineUnitPrice != null
      ? formatClosureBaselineLabel(closureBaselineQuantity, closureBaselineUnitPrice, unit)
      : null

  useEffect(() => {
    setQtyValue(formatInputNumber(quantity))
    setPriceValue(unitPrice.toFixed(2))
    setError(null)
  }, [quantity, unitPrice, itemId])

  useEffect(() => {
    setSaved(false)
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }, [itemId])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const parsedQty = parseFloat(qtyValue.replace(',', '.'))
  const parsedPrice = parseFloat(priceValue.replace(',', '.'))
  const previewLineTotal =
    Number.isFinite(parsedQty) && Number.isFinite(parsedPrice)
      ? parsedQty * parsedPrice
      : quantity * unitPrice

  function focusStillInFields(relatedTarget: EventTarget | null): boolean {
    return Boolean(
      relatedTarget instanceof Node &&
      fieldsRef.current?.contains(relatedTarget),
    )
  }

  function applyServerResult(data: Record<string, unknown>) {
    onUpdated({
      orderId,
      itemId,
      quantity: data.quantity as number,
      unitPrice: data.unitPrice as number,
      newTotal: data.newTotal as number,
      closureBaselineQuantity: (data.closureBaselineQuantity as number | null) ?? null,
      closureBaselineUnitPrice: (data.closureBaselineUnitPrice as number | null) ?? null,
    })
  }

  function showSavedFeedback() {
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => {
      setSaved(false)
      savedTimerRef.current = null
    }, SAVED_FEEDBACK_MS)
  }

  async function saveChanges(relatedTarget: EventTarget | null = null) {
    if (disabled || saving) return
    if (focusStillInFields(relatedTarget)) return

    const nextQty = parseFloat(qtyValue.replace(',', '.'))
    const nextPrice = parseFloat(priceValue.replace(',', '.'))

    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      setError('Quantité > 0 requise.')
      setQtyValue(formatInputNumber(quantity))
      return
    }
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setError('Prix ≥ 0 requis.')
      setPriceValue(unitPrice.toFixed(2))
      return
    }
    if (nextQty === quantity && nextPrice === unitPrice) return

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/orders/update-item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: itemId,
          quantity: nextQty,
          unitPrice: nextPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Mise à jour impossible.')

      applyServerResult(data)
      showSavedFeedback()
    } catch (e) {
      setError((e as Error).message)
      setQtyValue(formatInputNumber(quantity))
      setPriceValue(unitPrice.toFixed(2))
    } finally {
      setSaving(false)
    }
  }

  async function restoreBaseline() {
    if (disabled || saving || !isModified || !baselineLabel) return

    const ok = window.confirm(
      `Rétablir cette ligne comme à la livraison ?\n\nOrigine : ${baselineLabel}`,
    )
    if (!ok) return

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/orders/update-item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId: itemId, reset: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Rétablissement impossible.')

      applyServerResult(data)
      showSavedFeedback()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    void saveChanges(e.relatedTarget)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setQtyValue(formatInputNumber(quantity))
      setPriceValue(unitPrice.toFixed(2))
      setError(null)
      setSaved(false)
      e.currentTarget.blur()
    }
  }

  return (
    <div className={lineStyles.closureEdit}>
      {hasBaseline && baselineLabel && (
        <div className={lineStyles.closureEditMeta}>
          {isModified && (
            <span className={lineStyles.closureModifiedBadge}>Modifié</span>
          )}
          <p className={lineStyles.closureBaselineRef}>
            Origine livraison&nbsp;: {baselineLabel}
          </p>
          {isModified && (
            <button
              type="button"
              className={lineStyles.closureRestoreBtn}
              disabled={disabled || saving}
              onClick={() => void restoreBaseline()}
            >
              ↩ Rétablir
            </button>
          )}
        </div>
      )}

      <div ref={fieldsRef} className={lineStyles.closureEditFields}>
        <label className={lineStyles.closureEditLabel} htmlFor={qtyId}>
          Qté
          <span className={lineStyles.closureEditInputWrap}>
            <input
              id={qtyId}
              type="text"
              inputMode="decimal"
              className={lineStyles.closureEditInput}
              value={qtyValue}
              disabled={disabled || saving}
              aria-label={`Quantité (${unit})`}
              onChange={e => setQtyValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            <span className={lineStyles.closureEditUnit}>{unit}</span>
          </span>
        </label>

        <label className={lineStyles.closureEditLabel} htmlFor={priceId}>
          Prix / unité
          <span className={lineStyles.closureEditInputWrap}>
            <span className={lineStyles.closureEditPrefix} aria-hidden>CHF</span>
            <input
              id={priceId}
              type="text"
              inputMode="decimal"
              className={lineStyles.closureEditInput}
              value={priceValue}
              disabled={disabled || saving}
              aria-label="Prix unitaire en francs suisses"
              onChange={e => setPriceValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </span>
        </label>
      </div>

      <div className={lineStyles.closureEditTotalWrap}>
        <span className={lineStyles.lineTotal}>
          {saving ? 'Enregistrement…' : `CHF ${previewLineTotal.toFixed(2)}`}
        </span>
        {saved && !saving && (
          <span className={lineStyles.closureEditSaved} role="status" aria-live="polite">
            ✓ Enregistré
          </span>
        )}
      </div>

      {error && (
        <p className={lineStyles.closureEditError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
