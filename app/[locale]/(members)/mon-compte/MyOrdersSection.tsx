'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'
import type { OrderWithItems } from '@/lib/supabase/auth'
import styles from './my-orders.module.css'

const PAGE_SIZE = 15

const ORDER_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Brouillon',  bg: '#f3f4f6', color: '#374151' },
  confirmed: { label: 'Confirmée', bg: '#fff8e6', color: '#DC7F00' },
  delivered: { label: 'Livrée',    bg: '#e3f2fd', color: '#1565c0' },
  closed:    { label: 'Clôturée',  bg: '#e8f5e9', color: '#2e7d32' },
  cancelled: { label: 'Annulée',   bg: '#fdecea', color: '#c0392b' },
}

const SUPPLIER_TYPE: Record<string, string> = {
  local:         'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre:         'Autre',
}

type TabId = 'active' | 'history'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-CH', {
    month: 'long',
    year: 'numeric',
  })
}

function isActiveOrder(status: string) {
  return status === 'confirmed' || status === 'draft' || status === 'delivered'
}

function groupByMonth(orders: OrderWithItems[]) {
  const groups = new Map<string, OrderWithItems[]>()
  for (const order of orders) {
    const key = monthKey(order.created_at)
    const list = groups.get(key) ?? []
    list.push(order)
    groups.set(key, list)
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

export default function MyOrdersSection({
  orders,
  hasCatalogAccess,
}: {
  orders: OrderWithItems[]
  hasCatalogAccess: boolean
}) {
  const [tab, setTab] = useState<TabId>('active')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [exporting, setExporting] = useState(false)

  const activeOrders = useMemo(
    () => orders.filter(o => isActiveOrder(o.status)),
    [orders],
  )
  const historyOrders = useMemo(
    () => orders.filter(o => !isActiveOrder(o.status)),
    [orders],
  )

  const tabOrders = tab === 'active' ? activeOrders : historyOrders
  const visibleOrders = tabOrders.slice(0, visibleCount)
  const monthGroups = useMemo(() => groupByMonth(visibleOrders), [visibleOrders])

  const currentMonthKey = monthKey(new Date().toISOString())
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length
  const activeTotal = activeOrders.reduce((s, o) => s + o.total, 0)

  function switchTab(next: TabId) {
    setTab(next)
    setVisibleCount(PAGE_SIZE)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/member/orders/export')
      if (!res.ok) {
        alert('Impossible de télécharger l\'historique.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mes-commandes-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Mes commandes</h2>
        <div className={styles.empty}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🛒</p>
          <p style={{ margin: '0 0 1.25rem' }}>
            Vous n&apos;avez pas encore passé de commande.
          </p>
          {hasCatalogAccess ? (
            <Link
              href="/commandes"
              style={{
                display: 'inline-block',
                background: '#DC7F00',
                color: '#fff',
                borderRadius: 8,
                padding: '0.55rem 1.5rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Voir le catalogue →
            </Link>
          ) : (
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Le catalogue sera accessible après validation de votre adhésion.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mes commandes</h2>
        <div className={styles.stats}>
          {confirmedCount > 0 && (
            <span className={styles.pending}>
              {confirmedCount} en attente
            </span>
          )}
          <span className={styles.muted}>
            {activeOrders.length} active{activeOrders.length !== 1 ? 's' : ''}
            {' · '}CHF {activeTotal.toFixed(2)}
          </span>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Téléchargement…' : '↓ Télécharger CSV'}
          </button>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Filtrer les commandes">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
          onClick={() => switchTab('active')}
        >
          En cours
          <span className={styles.tabCount}>{activeOrders.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => switchTab('history')}
        >
          Historique
          <span className={styles.tabCount}>{historyOrders.length}</span>
        </button>
      </div>

      {tabOrders.length === 0 ? (
        <div className={styles.empty}>
          {tab === 'active'
            ? 'Aucune commande en cours.'
            : 'Aucune commande dans l\u2019historique pour le moment.'}
        </div>
      ) : (
        <>
          {monthGroups.map(([key, monthOrders]) => (
            <details
              key={key}
              className={styles.monthGroup}
              open={key === currentMonthKey || monthGroups.length === 1}
            >
              <summary className={styles.monthSummary}>
                <span style={{ textTransform: 'capitalize' }}>{monthLabel(key)}</span>
                <span className={styles.monthMeta}>
                  {monthOrders.length} commande{monthOrders.length !== 1 ? 's' : ''}
                  {' · '}CHF {monthOrders.reduce((s, o) => s + o.total, 0).toFixed(2)}
                </span>
              </summary>

              <div className={styles.monthOrders}>
                {monthOrders.map(order => {
                  const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.draft
                  return (
                    <details key={order.id} className={styles.order}>
                      <summary className={styles.orderSummary}>
                        <div style={{ minWidth: 0 }}>
                          <span className={styles.supplierName}>
                            {order.supplier?.name ?? 'Fournisseur inconnu'}
                          </span>
                          <span className={styles.supplierType}>
                            {SUPPLIER_TYPE[order.supplier?.type ?? ''] ?? ''}
                          </span>
                        </div>
                        <div className={styles.orderMeta}>
                          <span className={styles.date}>{formatDate(order.created_at)}</span>
                          <span
                            className={styles.status}
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                          <span className={styles.total}>
                            {order.status === 'closed'
                              ? <>CHF {order.total.toFixed(2)}</>
                              : <>CHF {order.total.toFixed(2)} <span style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.55 }}>(provisoire)</span></>}
                            {(Number(order.credit_applied) || 0) > 0 && (
                              <span style={{
                                display: 'block',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#2e7d32',
                              }}>
                                Avoir −{(Number(order.credit_applied)).toFixed(2)} CHF
                              </span>
                            )}
                          </span>
                        </div>
                      </summary>

                      <div className={styles.orderDetail}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Produit</th>
                              <th>Qté</th>
                              <th>P.U.</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items.map(item => (
                              <tr key={item.id}>
                                <td>{item.product?.name ?? '—'}</td>
                                <td style={{ opacity: 0.7 }}>
                                  {item.quantity} {item.product?.unit}
                                </td>
                                <td style={{ opacity: 0.55 }}>
                                  CHF {item.unit_price.toFixed(2)}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  CHF {(item.quantity * item.unit_price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3} style={{ paddingTop: '0.5rem', fontWeight: 600, opacity: 0.65 }}>
                                {order.status === 'closed' ? 'Total final' : 'Total provisoire'}
                              </td>
                              <td style={{ paddingTop: '0.5rem', fontWeight: 800 }}>
                                CHF {order.total.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                        {order.status === 'delivered' && hasCatalogAccess && order.supplier?.id && (
                          <Link
                            href={`/commandes?extendOrder=${order.id}&supplierId=${order.supplier.id}`}
                            style={{
                              display: 'inline-flex',
                              marginTop: '0.85rem',
                              padding: '0.45rem 0.9rem',
                              borderRadius: 999,
                              border: '1.5px solid #DC7F00',
                              color: '#DC7F00',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            + Compléter cette commande
                          </Link>
                        )}
                        {order.status === 'delivered' && (
                          <p style={{ margin: '0.65rem 0 0', fontSize: '0.78rem', opacity: 0.6, lineHeight: 1.45 }}>
                            Commande modifiable jusqu&apos;à clôture par l&apos;équipe. Avoir appliqué à ce moment-là.
                          </p>
                        )}
                      </div>
                    </details>
                  )
                })}
              </div>
            </details>
          ))}

          {visibleCount < tabOrders.length && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            >
              Voir plus ({tabOrders.length - visibleCount} restante{tabOrders.length - visibleCount !== 1 ? 's' : ''})
            </button>
          )}
        </>
      )}
    </div>
  )
}
