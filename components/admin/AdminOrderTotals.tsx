import { orderCreditApplied, orderGrossTotal } from '@/lib/orders/order-totals-display'
import lineStyles from '@/components/orders/order-lines.module.css'

type Item = {
  quantity: number
  unit_price: number
  cancelled_at?: string | null
}

type Props = {
  items?: Item[]
  total: number
  creditApplied?: number | null
  grossTotal?: number
  /** confirmed | delivered → produits seuls ; closed → avoir déduit */
  status?: string
  compact?: boolean
  finalLabel?: string
}

export default function AdminOrderTotals({
  items = [],
  total,
  creditApplied,
  grossTotal,
  status,
  compact = false,
  finalLabel = 'Total final',
}: Props) {
  const gross = grossTotal ?? orderGrossTotal(items)
  const isClosed = status === 'closed'
  const credit = orderCreditApplied(creditApplied)
  const showBreakdown = isClosed && credit > 0

  if (!isClosed) {
    if (compact) {
      return (
        <div className="admin-order-totals admin-order-totals--compact">
          <span className="admin-order-totals__gross">CHF {gross.toFixed(2)}</span>
          <span className="admin-order-totals__provisional">produits</span>
        </div>
      )
    }
    return (
      <div className={lineStyles.totalsBlock}>
        <p className={lineStyles.totalsLabel}>Récapitulatif</p>
        <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowFinal}`}>
          <span className={lineStyles.totalsFinalLabel}>Total produits</span>
          <span className={lineStyles.totalsFinalAmount}>CHF {gross.toFixed(2)}</span>
        </div>
        <p className={lineStyles.totalsHint}>
          Avoir déduit à la <strong>clôture</strong> uniquement.
        </p>
      </div>
    )
  }

  if (compact && showBreakdown) {
    return (
      <div className="admin-order-totals admin-order-totals--compact">
        <span className="admin-order-totals__gross">CHF {gross.toFixed(2)}</span>
        <span className="admin-order-totals__credit">−{credit.toFixed(2)} avoir</span>
        <span className="admin-order-totals__final">= CHF {total.toFixed(2)}</span>
      </div>
    )
  }

  if (!showBreakdown) {
    return (
      <span style={{ fontWeight: 700, fontSize: compact ? '0.95rem' : '1.05rem' }}>
        CHF {total.toFixed(2)}
      </span>
    )
  }

  return (
    <div className={lineStyles.totalsBlock}>
      {!compact && <p className={lineStyles.totalsLabel}>Récapitulatif</p>}
      <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowMuted}`}>
        <span>Sous-total produits</span>
        <span>CHF {gross.toFixed(2)}</span>
      </div>
      <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowCredit}`}>
        <span>Déduction avoir</span>
        <span>− CHF {credit.toFixed(2)}</span>
      </div>
      <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowFinal}`}>
        <span className={lineStyles.totalsFinalLabel}>{finalLabel}</span>
        <span className={lineStyles.totalsFinalAmount}>CHF {total.toFixed(2)}</span>
      </div>
    </div>
  )
}
