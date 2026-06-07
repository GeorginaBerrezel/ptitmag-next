'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'
import type { OrderWithItems } from '@/lib/supabase/auth'
import MemberOrderDetail from '@/components/orders/MemberOrderDetail'
import AccordionChevron from '@/components/ui/AccordionChevron'
import { InlineStatus } from '@/components/ui/InlineStatus'
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

type TabId = 'confirmed' | 'delivered' | 'closed' | 'cancelled'

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

function tabActiveClass(tab: TabId, current: TabId): string {
  if (tab !== current) return styles.tab
  if (current === 'delivered') return `${styles.tab} ${styles.tabActiveDelivered}`
  if (current === 'closed') return `${styles.tab} ${styles.tabActiveClosed}`
  if (current === 'cancelled') return `${styles.tab} ${styles.tabActiveCancelled}`
  return `${styles.tab} ${styles.tabActive}`
}

export default function MyOrdersSection({
  orders,
  hasCatalogAccess,
}: {
  orders: OrderWithItems[]
  hasCatalogAccess: boolean
}) {
  const [tab, setTab] = useState<TabId>('confirmed')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [exporting, setExporting] = useState(false)

  const confirmedOrders = useMemo(
    () => orders.filter(o => o.status === 'confirmed' || o.status === 'draft'),
    [orders],
  )
  const deliveredOrders = useMemo(
    () => orders.filter(o => o.status === 'delivered'),
    [orders],
  )
  const closedOrders = useMemo(
    () => orders.filter(o => o.status === 'closed'),
    [orders],
  )
  const cancelledOrders = useMemo(
    () => orders.filter(o => o.status === 'cancelled'),
    [orders],
  )

  const tabOrders =
    tab === 'confirmed' ? confirmedOrders
    : tab === 'delivered' ? deliveredOrders
    : tab === 'closed' ? closedOrders
    : cancelledOrders

  const visibleOrders = tabOrders.slice(0, visibleCount)
  const monthGroups = useMemo(() => groupByMonth(visibleOrders), [visibleOrders])

  const currentMonthKey = monthKey(new Date().toISOString())
  const confirmedCount = confirmedOrders.length
  const deliveredCount = deliveredOrders.length
  const activeTotal = [...confirmedOrders, ...deliveredOrders].reduce((s, o) => s + o.total, 0)

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
              Commander →
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
            {confirmedCount + deliveredCount} en cours
            {' · '}CHF {activeTotal.toFixed(2)}
          </span>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? 'Téléchargement…' : '↓ Télécharger CSV'}
          </button>
        </div>
      </div>

      {exporting && (
        <InlineStatus message="Préparation de votre export CSV…" live="assertive" className={styles.exportLoading} />
      )}

      <div className={styles.tabs} role="tablist" aria-label="Filtrer les commandes">
        <button
          type="button"
          role="tab"
          id="tab-confirmed"
          aria-controls="panel-orders"
          aria-selected={tab === 'confirmed'}
          className={tabActiveClass('confirmed', tab)}
          onClick={() => switchTab('confirmed')}
        >
          Confirmées
          <span className={styles.tabCount}>{confirmedCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-delivered"
          aria-controls="panel-orders"
          aria-selected={tab === 'delivered'}
          className={tabActiveClass('delivered', tab)}
          onClick={() => switchTab('delivered')}
        >
          Livrées
          <span className={styles.tabCount}>{deliveredCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-closed"
          aria-controls="panel-orders"
          aria-selected={tab === 'closed'}
          className={tabActiveClass('closed', tab)}
          onClick={() => switchTab('closed')}
        >
          Clôturées
          <span className={styles.tabCount}>{closedOrders.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-cancelled"
          aria-controls="panel-orders"
          aria-selected={tab === 'cancelled'}
          className={tabActiveClass('cancelled', tab)}
          onClick={() => switchTab('cancelled')}
        >
          Annulées
          <span className={styles.tabCount}>{cancelledOrders.length}</span>
        </button>
      </div>

      <div
        id="panel-orders"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
      {tabOrders.length === 0 ? (
        <div className={styles.empty}>
          {tab === 'confirmed' && 'Aucune commande confirmée en attente.'}
          {tab === 'delivered' && 'Aucune commande livrée à compléter pour le moment.'}
          {tab === 'closed' && 'Aucune commande clôturée — les commandes finalisées apparaîtront ici.'}
          {tab === 'cancelled' && 'Aucune commande annulée.'}
        </div>
      ) : (
        <>
          {monthGroups.map(([key, monthOrders]) => (
            <details
              key={key}
              className={styles.monthGroup}
              open={key === currentMonthKey || monthGroups.length === 1}
            >
              <summary className={styles.monthSummary} aria-label={`Mois ${monthLabel(key)}, afficher les commandes`}>
                <span className={styles.summaryLead}>
                  <AccordionChevron />
                  <span className={styles.monthLabel}>{monthLabel(key)}</span>
                  <span className={styles.expandHint}>Mois</span>
                </span>
                <span className={styles.monthMeta}>
                  {monthOrders.length} commande{monthOrders.length !== 1 ? 's' : ''}
                  {' · '}CHF {monthOrders.reduce((s, o) => s + o.total, 0).toFixed(2)}
                </span>
              </summary>

              <div className={styles.monthOrders}>
                {monthOrders.map(order => {
                  const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.draft
                  const supplierName = order.supplier?.name ?? 'Fournisseur inconnu'
                  return (
                    <details key={order.id} className={styles.order}>
                      <summary
                        className={styles.orderSummary}
                        aria-label={`Commande ${supplierName}, afficher le détail`}
                      >
                        <div className={styles.supplierBlock}>
                          <span className={styles.supplierName}>{supplierName}</span>
                          <span className={styles.supplierType}>
                            {SUPPLIER_TYPE[order.supplier?.type ?? ''] ?? ''}
                          </span>
                          {order.created_via_complement && (
                            <div className={styles.badgeRow}>
                              <span className={styles.complementBadge}>Ajout sur place</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.orderMeta}>
                          <div className={styles.orderMetaTop}>
                            <span className={styles.date}>{formatDate(order.created_at)}</span>
                            <span
                              className={styles.status}
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.label}
                            </span>
                          </div>
                          <span className={styles.total}>
                            CHF {order.total.toFixed(2)}
                            {order.status !== 'closed' && order.status !== 'cancelled' && (
                              <span className={styles.totalProvisional}> (provisoire)</span>
                            )}
                            {(Number(order.credit_applied) || 0) > 0 && order.status === 'closed' && (
                              <span className={styles.creditHint}>
                                Avoir −{(Number(order.credit_applied)).toFixed(2)} CHF
                              </span>
                            )}
                          </span>
                        </div>
                        <AccordionChevron className={styles.orderChevron} />
                      </summary>

                      <MemberOrderDetail
                        order={order}
                        hasCatalogAccess={hasCatalogAccess}
                      />
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
    </div>
  )
}
