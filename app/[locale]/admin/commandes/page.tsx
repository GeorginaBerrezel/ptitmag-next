'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import {
  collectExportRows,
  collectOrderFinancialSummaries,
  computeAggregatedSummary,
  type AggregatedExportLine,
  type OrderExportInput,
} from '@/lib/admin/order-export'
import { buildOrdersExcelBuffer } from '@/lib/admin/order-export-xlsx'
import { ARCHIVE_AFTER_MONTHS } from '@/lib/admin/order-archive'
import { getMemberDisplayName, groupOrdersByMember, sumOrderTotals } from '@/lib/admin/member-display'
import { computeMemberCloseCredits } from '@/lib/orders/compute-member-close-credits'
import { CLOSURE_ADD_LINE_LABEL } from '@/lib/orders/closure-add-label'
import { orderCreditApplied, orderGrossTotal } from '@/lib/orders/order-totals-display'
import lineStyles from '@/components/orders/order-lines.module.css'
import AccordionChevron from '@/components/ui/AccordionChevron'
import accordionStyles from '@/components/ui/accordion.module.css'
import { InlineStatus } from '@/components/ui/InlineStatus'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'
import AdminOrderTotals from '@/components/admin/AdminOrderTotals'
import AdminAddProductAtClosure from '@/components/admin/AdminAddProductAtClosure'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  added_at_closure?: boolean
  product: { name: string; unit: string; supplier_ref: string | null } | null
}

type AdminOrder = {
  id: string
  member_id: string
  status: string
  total: number
  credit_applied?: number
  created_at: string
  archived_at?: string | null
  member: {
    full_name: string | null
    email: string | null
    username: string | null
    credit_balance?: number
  } | null
  supplier: { name: string; type: string } | null
  order_items: OrderItem[]
}

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  confirmed: { label: 'Confirmée', bg: '#fff8e6', color: '#DC7F00', border: '#DC7F00' },
  delivered: { label: 'Livrée',    bg: '#e3f2fd', color: '#1565c0', border: '#1565c0' },
  closed:    { label: 'Clôturée',  bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
  cancelled: { label: 'Annulée',   bg: '#fdecea', color: '#c0392b', border: '#c0392b' },
}

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  local:         'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre:         'Autre',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(order: Pick<AdminOrder, 'member'>) {
  return getMemberDisplayName(order.member ?? {})
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminCommandesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)

  const [orders, setOrders]           = useState<AdminOrder[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  // Mode : 'action' = commandes à traiter (confirmed par défaut)
  //        'history' = tout l'historique avec filtres libres
  const [mode, setMode]               = useState<'action' | 'toClose' | 'closed' | 'history'>('action')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterDate, setFilterDate]         = useState('')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [exporting, setExporting]     = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [removingAggregateKey, setRemovingAggregateKey] = useState<string | null>(null)
  const [closingMemberId, setClosingMemberId] = useState<string | null>(null)
  const [notifyingMemberId, setNotifyingMemberId] = useState<string | null>(null)
  const [addingProductMemberId, setAddingProductMemberId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archivableCount, setArchivableCount] = useState(0)
  const [archiving, setArchiving] = useState(false)
  const [reportYears, setReportYears] = useState<number[]>([])
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear())
  const [downloadingReport, setDownloadingReport] = useState(false)

  // ── Chargement des commandes ─────────────────────────────────────────────

  const fetchOrders = useCallback(async (includeArchived = showArchived) => {
    setLoading(true)
    setError(null)
    const qs = includeArchived ? '?includeArchived=1' : ''
    const res = await fetch(`/api/admin/orders${qs}`)
    if (!res.ok) {
      setError('Impossible de charger les commandes. Vérifie ta connexion.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setOrders(data.orders ?? [])
    setArchivableCount(data.archivableCount ?? 0)
    setLoading(false)
  }, [showArchived])

  useEffect(() => { fetchOrders(showArchived) }, [fetchOrders, showArchived])

  useEffect(() => {
    fetch('/api/admin/orders/annual-report')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const years = (data?.years as number[] | undefined) ?? []
        setReportYears(years)
        if (years.length > 0) setReportYear(years[0])
      })
      .catch(() => {})
  }, [])

  // ── Filtres ───────────────────────────────────────────────────────────────

  const suppliers = Array.from(
    new Set(orders.map(o => o.supplier?.name).filter(Boolean))
  ) as string[]

  const filtered = orders.filter(o => {
    if (mode === 'action' && o.status !== 'confirmed') return false
    if (mode === 'toClose' && o.status !== 'delivered') return false
    if (mode === 'closed' && o.status !== 'closed') return false
    if (mode === 'history') {
      if (filterStatus && o.status !== filterStatus) return false
    }
    if (filterSupplier && o.supplier?.name !== filterSupplier) return false
    if (filterDate) {
      const d = new Date(o.created_at).toISOString().slice(0, 10)
      if (d !== filterDate) return false
    }
    return true
  })

  const groupedOrders = useMemo(
    () =>
      groupOrdersByMember(
        filtered,
        getMemberName,
        order => order.member?.email ?? null,
      ),
    [filtered],
  )

  const hasFilters = filterStatus || filterSupplier || filterDate

  const aggregatedSummary = useMemo(() => {
    if (!filterSupplier || filtered.length === 0) return null
    return computeAggregatedSummary(filtered as OrderExportInput[], getMemberName, formatDate)
  }, [filterSupplier, filtered])

  const aggregatedTotal = useMemo(
    () => aggregatedSummary?.reduce((s, l) => s + l.totalAmount, 0) ?? 0,
    [aggregatedSummary],
  )

  const canRemoveFromRecap = mode === 'action' || mode === 'toClose'

  function switchMode(next: 'action' | 'toClose' | 'closed' | 'history') {
    setMode(next)
    setFilterStatus('')
    setFilterSupplier('')
    setFilterDate('')
  }

  // ── Statistiques ─────────────────────────────────────────────────────────

  const stats = {
    total:       orders.filter(o => !o.archived_at).length,
    archived:    orders.filter(o => o.archived_at).length,
    confirmed:   orders.filter(o => o.status === 'confirmed' && !o.archived_at).length,
    delivered:   orders.filter(o => o.status === 'delivered' && !o.archived_at).length,
    toClose:     orders.filter(o => o.status === 'delivered' && !o.archived_at).length,
    closed:      orders.filter(o => o.status === 'closed' && !o.archived_at).length,
    cancelled:   orders.filter(o => o.status === 'cancelled' && !o.archived_at).length,
    totalAmount: orders
      .filter(o => o.status !== 'cancelled' && !o.archived_at)
      .reduce((s, o) => s + o.total, 0),
  }

  // ── Mise à jour de statut ─────────────────────────────────────────────────

  async function updateStatus(orderId: string, newStatus: string) {
    const prevStatus = orders.find(o => o.id === orderId)?.status
    setUpdating(orderId)

    // Mise à jour optimiste : on change l'affichage immédiatement
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ))

    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: newStatus }),
    })

    if (!res.ok) {
      // En cas d'erreur API, on revient à l'état précédent
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: prevStatus ?? 'confirmed' } : o
      ))
      alert('Erreur lors de la mise à jour du statut. Réessaie.')
    }

    setUpdating(null)
  }

  async function notifyMemberDelivery(memberId: string, memberName: string, deliveredCount: number) {
    const ok = window.confirm(
      `Envoyer l'email de retrait à ${memberName} ?\n\n` +
        `${deliveredCount} commande${deliveredCount > 1 ? 's' : ''} livrée${deliveredCount > 1 ? 's' : ''} — ` +
        'un seul email regroupant tous les fournisseurs.',
    )
    if (!ok) return

    setNotifyingMemberId(memberId)
    try {
      const res = await fetch('/api/admin/orders/notify-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de l\'envoi.')

      if (data.emailSent === false) {
        alert('Email non envoyé (SMTP ou adresse introuvable).')
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setNotifyingMemberId(null)
    }
  }

  async function closeMemberOrders(memberId: string, memberName: string, deliveredCount: number) {
    const ok = window.confirm(
      `Clôturer toutes les commandes livrées de ${memberName} ?\n\n` +
        `${deliveredCount} commande${deliveredCount > 1 ? 's' : ''} — l'avoir sera déduit une seule fois sur le total membre. ` +
        'Un seul email récapitulatif regroupé sera envoyé.',
    )
    if (!ok) return

    setClosingMemberId(memberId)
    try {
      const res = await fetch('/api/admin/orders/close-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la clôture.')

      const closedById = new Map(
        (data.orders as Array<{ orderId: string; total: number; creditApplied: number }>).map(o => [
          o.orderId,
          { total: o.total, creditApplied: o.creditApplied },
        ]),
      )

      setOrders(prev => prev.map(o =>
        closedById.has(o.id)
          ? {
              ...o,
              status: 'closed',
              total: closedById.get(o.id)!.total,
              credit_applied: closedById.get(o.id)!.creditApplied,
            }
          : o,
      ))

      if (data.emailSent === false) {
        alert('Commandes clôturées, mais l\'email n\'a pas pu être envoyé.')
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setClosingMemberId(null)
    }
  }

  async function cancelOrderItem(orderId: string, item: OrderItem) {
    const productName = item.product?.name ?? 'ce produit'
    const lineTotal = (item.quantity * item.unit_price).toFixed(2)
    const ok = window.confirm(
      `Retirer « ${productName} » (CHF ${lineTotal}) de cette commande ?\n\nLe membre recevra un email avec le nouveau total.`,
    )
    if (!ok) return

    setRemovingItemId(item.id)
    try {
      const res = await fetch('/api/admin/orders/cancel-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors du retrait.')

      setOrders(prev => prev.flatMap(o => {
        if (o.id !== orderId) return [o]
        if (data.orderStatus === 'cancelled') return []
        return [{
          ...o,
          total: data.newTotal as number,
          status: data.orderStatus as string,
          order_items: o.order_items.filter(i => i.id !== item.id),
        }]
      }))

      if (data.emailSent === false) {
        alert('Produit retiré, mais aucun email n\'a pu être envoyé au membre (adresse introuvable).')
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setRemovingItemId(null)
    }
  }

  async function cancelAggregatedLine(line: AggregatedExportLine) {
    const refLabel = line.articleRef || line.product
    const ok = window.confirm(
      `Retirer « ${line.product} »${line.articleRef ? ` (réf. ${line.articleRef})` : ''} ` +
        `de ${line.orderItemIds.length} ligne${line.orderItemIds.length > 1 ? 's' : ''} ` +
        `dans ${line.orderItemIds.length} commande(s) ?\n\n` +
        'Les membres concernés recevront un email avec le nouveau total.',
    )
    if (!ok) return

    const aggregateKey = line.articleRef || line.product
    setRemovingAggregateKey(aggregateKey)
    try {
      for (const orderItemId of line.orderItemIds) {
        const res = await fetch('/api/admin/orders/cancel-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderItemId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erreur lors du retrait.')
      }
      await fetchOrders(showArchived)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setRemovingAggregateKey(null)
    }
  }

  async function exportExcel() {
    const rows = collectExportRows(filtered as OrderExportInput[], getMemberName, formatDate)
    if (rows.length === 0) return

    setExporting(true)
    try {
      const financialSummaries = collectOrderFinancialSummaries(
        filtered as OrderExportInput[],
        getMemberName,
        formatDate,
      )
      const buffer = await buildOrdersExcelBuffer({
        rows,
        supplierTypeLabels: SUPPLIER_TYPE_LABELS,
        singleSupplier: filterSupplier || undefined,
        financialSummaries,
      })

      const slug = filterSupplier
        ? filterSupplier.replace(/[^\w\s-àâäéèêëïîôùûüç]/gi, '').replace(/\s+/g, '-').slice(0, 40)
        : 'tous'
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `commandes-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function archiveEligibleOrders() {
    const ok = window.confirm(
      `Archiver ${archivableCount} commande(s) clôturée(s) de plus de ${ARCHIVE_AFTER_MONTHS} mois ?\n\nElles disparaîtront de l'historique actif mais restent en base (bilan annuel, export adhérent).`,
    )
    if (!ok) return

    setArchiving(true)
    try {
      const res = await fetch('/api/admin/orders/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de l\'archivage.')
      await fetchOrders(showArchived)
      alert(data.message ?? 'Archivage terminé.')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setArchiving(false)
    }
  }

  async function toggleOrderArchive(order: AdminOrder, unarchive: boolean) {
    setArchiving(true)
    try {
      const res = await fetch('/api/admin/orders/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, unarchive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur.')
      await fetchOrders(showArchived)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setArchiving(false)
    }
  }

  async function downloadAnnualReport() {
    setDownloadingReport(true)
    try {
      const res = await fetch(`/api/admin/orders/annual-report?year=${reportYear}`)
      if (!res.ok) {
        alert('Impossible de générer le bilan annuel.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilan-annuel-${reportYear}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingReport(false)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page admin-page--medium">

      <AdminBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Commandes' }]} />

      {/* En-tête */}
      <div className="admin-head">
        <div className="admin-head__main">
          <h1>
            {mode === 'action' && 'Commandes à traiter'}
            {mode === 'toClose' && 'Commandes à clôturer'}
            {mode === 'closed' && 'Commandes clôturées'}
            {mode === 'history' && 'Historique des commandes'}
          </h1>
          <p className="admin-lead" style={{ margin: 0 }}>
            {mode === 'action' &&
              'Confirmées : marquer « Livrée » après distribution, ou « Annulée » si besoin.'}
            {mode === 'toClose' &&
              'Livrées : le membre peut encore ajouter des produits. Quand tout est bon, clique « Clôturer » — le total est figé et le statut passe à Clôturée.'}
            {mode === 'closed' &&
              'Commandes finalisées — montant et avoir définitifs. Utilise « Historique » pour les filtres avancés.'}
            {mode === 'history' &&
              'Historique complet — filtre par statut (dont Clôturées) pour retrouver une commande.'}
          </p>
        </div>
        <button
          type="button"
          onClick={exportExcel}
          disabled={filtered.length === 0 || loading || exporting}
          className="admin-btn admin-btn--primary"
        >
          {exporting ? 'Export…' : `↓ Exporter Excel${filtered.length > 0 ? ` (${filtered.length})` : ''}`}
        </button>
      </div>

      {/* Statistiques — adaptées au mode */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem', marginTop: '1.5rem',
      }}>
        {(mode === 'action' ? [
          { label: 'À traiter',   value: stats.confirmed,   color: '#DC7F00', highlight: true },
          { label: 'À clôturer',  value: stats.toClose,     color: '#1565c0' },
          { label: 'CA semaine',  value: `CHF ${stats.totalAmount.toFixed(2)}`, color: '#2e7d32' },
        ] : mode === 'toClose' ? [
          { label: 'À clôturer',  value: stats.toClose,     color: '#1565c0', highlight: true },
          { label: 'Clôturées',   value: stats.closed,      color: '#2e7d32' },
        ] : mode === 'closed' ? [
          { label: 'Clôturées',   value: stats.closed,      color: '#2e7d32', highlight: true },
        ] : [
          { label: 'Total',       value: stats.total,       color: '#1a1a2e' },
          { label: 'Confirmées',  value: stats.confirmed,   color: '#DC7F00' },
          { label: 'Livrées',     value: stats.delivered,   color: '#1565c0' },
          { label: 'Clôturées',   value: stats.closed,      color: '#2e7d32' },
          { label: 'Annulées',    value: stats.cancelled,   color: '#c0392b' },
          { label: 'Archivées',   value: showArchived ? stats.archived : '—', color: '#6b7280' },
          { label: 'CA total',    value: `CHF ${stats.totalAmount.toFixed(2)}`, color: '#2e7d32' },
        ]).map(s => (
          <div key={s.label} style={{
            background: '#fff',
            border: `1px solid ${'highlight' in s && s.highlight ? '#DC7F00' : 'rgba(16,24,40,0.08)'}`,
            borderRadius: 12, padding: '0.9rem 1rem',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 0.2rem', fontSize: '1.4rem', fontWeight: 700, color: s.color }}>
              {s.value}
            </p>
            <p className="admin-subtle" style={{ margin: 0, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Bascule de mode + filtres */}
      {!filterSupplier && !loading && filtered.length > 0 && (
        <div style={{
          background: '#fff8ed',
          border: '1px solid #ffe082',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
          fontSize: '0.85rem',
          color: '#92400e',
          lineHeight: 1.5,
        }}>
          <strong>Récap groupé :</strong> choisissez un fournisseur dans le menu ci-dessous pour afficher
          le tableau vert (quantités additionnées) et préparer la commande fournisseur.
        </div>
      )}

      {mode === 'history' && archivableCount > 0 && (
        <div style={{
          background: '#f0f4ff',
          border: '1px solid #c7d2fe',
          borderRadius: 10,
          padding: '0.85rem 1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#3730a3', lineHeight: 1.5 }}>
            <strong>{archivableCount} commande{archivableCount > 1 ? 's' : ''} livrée{archivableCount > 1 ? 's' : ''}</strong>
            {' '}de plus de {ARCHIVE_AFTER_MONTHS} mois peuvent être archivées — elles sortent de cette liste
            mais restent comptabilisées dans le bilan annuel.
          </p>
          <button
            type="button"
            onClick={() => void archiveEligibleOrders()}
            disabled={archiving || loading}
            className="admin-btn admin-btn--primary"
            style={{ background: '#4338ca' }}
          >
            {archiving ? 'Archivage…' : `Archiver (${archivableCount})`}
          </button>
        </div>
      )}

      {mode === 'history' && reportYears.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 10,
          padding: '0.85rem 1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32' }}>
              Bilan annuel
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.65 }}>
              Synthèse par fournisseur, mois et top produits — pour l&apos;association.
            </p>
          </div>
          <select
            value={reportYear}
            onChange={e => setReportYear(Number(e.target.value))}
            className="admin-field"
            style={{ minWidth: '7rem' }}
          >
            {reportYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void downloadAnnualReport()}
            disabled={downloadingReport}
            className="admin-btn admin-btn--primary"
          >
            {downloadingReport ? 'Génération…' : '↓ Bilan Excel'}
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filtrer les commandes admin">
          {([
            { key: 'action',  label: `À traiter${stats.confirmed ? ` (${stats.confirmed})` : ''}` },
            { key: 'toClose', label: `À clôturer${stats.toClose ? ` (${stats.toClose})` : ''}` },
            { key: 'closed',  label: `Clôturées${stats.closed ? ` (${stats.closed})` : ''}` },
            { key: 'history', label: 'Historique' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={mode === tab.key}
              onClick={() => switchMode(tab.key)}
              className={`admin-tabs__btn${mode === tab.key ? ' admin-tabs__btn--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtres supplémentaires (en mode historique seulement) */}
        {mode === 'history' && (
          <>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              aria-label="Filtrer par statut de commande"
              className="admin-field"
            >
              <option value="">Tous les statuts</option>
              <option value="confirmed">Confirmées</option>
              <option value="delivered">Livrées</option>
              <option value="closed">Clôturées</option>
              <option value="cancelled">Annulées</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="admin-field"
            />

            <label className="admin-check">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
              />
              Afficher les archives
            </label>
          </>
        )}

        {/* Filtre fournisseur (disponible dans les deux modes) */}
        <select
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          className="admin-field"
          style={{
            fontWeight: filterSupplier ? 700 : 400,
            borderColor: filterSupplier ? '#2e7d32' : undefined,
            background: filterSupplier ? '#f0f9f4' : undefined,
            minWidth: '12rem',
          }}
        >
          <option value="">Tous les fournisseurs</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Bouton réinitialiser filtres */}
        {hasFilters && mode === 'history' && (
          <button
            type="button"
            onClick={() => { setFilterStatus(''); setFilterSupplier(''); setFilterDate('') }}
            className="admin-btn admin-btn--danger-outline"
          >
            ✕ Réinitialiser
          </button>
        )}

        <span className="admin-subtle" style={{ marginLeft: 'auto', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
          {loading ? 'Chargement…' : `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* États de chargement / erreur / vide */}
      {loading && (
        <InlineStatus message="Chargement des commandes…" centered live="polite" />
      )}

      {error && (
        <div style={{
          background: '#fdecea', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b',
        }}>
          {error}
          <button
            onClick={() => void fetchOrders()}
            style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>
            {mode === 'action' || mode === 'toClose' ? '✓' : '📭'}
          </p>
          <p style={{ opacity: 0.5, margin: '0 0 1rem' }}>
            {mode === 'action' && 'Aucune commande confirmée en attente — tout est à jour !'}
            {mode === 'toClose' && 'Aucune commande livrée à clôturer pour le moment.'}
            {mode === 'closed' && 'Aucune commande clôturée pour le moment.'}
            {mode === 'history' && (
              hasFilters
                ? 'Aucune commande ne correspond à ces filtres.'
                : "Aucune commande dans l'historique."
            )}
          </p>
          {(mode === 'action' || mode === 'toClose' || mode === 'closed') && (
            <button
              type="button"
              onClick={() => switchMode('history')}
              className="admin-btn admin-btn--primary"
            >
              Voir l&apos;historique complet
            </button>
          )}
        </div>
      )}

      {!loading && !error && (mode === 'toClose' || mode === 'action') && filtered.length > 0 && (
        <p className="admin-order-groups__hint">
          {mode === 'action' && (
            <>
              <strong>Marquer Livrée</strong> commande par commande — elles passent ensuite dans l&apos;onglet{' '}
              <strong>À clôturer</strong>.
            </>
          )}
          {mode === 'toClose' && (
            <>
              <strong>✉ Email retrait</strong> puis <strong>✓ Clôturer tout</strong> — un seul email par membre,
              tous fournisseurs regroupés.
            </>
          )}
        </p>
      )}

      {!loading && !error && filterSupplier && filtered.length > 0 && aggregatedSummary && (
        <AggregatedSummaryPanel
          supplierName={filterSupplier}
          lines={aggregatedSummary}
          orderCount={filtered.length}
          totalAmount={aggregatedTotal}
          canRemove={canRemoveFromRecap}
          removingKey={removingAggregateKey}
          onRemoveLine={line => void cancelAggregatedLine(line)}
        />
      )}

      {!loading && !error && filterSupplier && filtered.length > 0 && (
        <p className="admin-order-groups__hint">
          <strong>Détail par membre</strong> — commandes <em>{filterSupplier}</em> uniquement
          (le tableau vert ci-dessus additionne les quantités pour passer commande chez ce fournisseur).
        </p>
      )}

      {/* Liste des commandes — accordéon par membre */}
      {!loading && !error && filtered.length > 0 && (
        <div className="admin-order-groups">
          {groupedOrders.map(group => {
            const groupTotal = sumOrderTotals(group.orders)
            const orderLabel = `${group.orders.length} commande${group.orders.length !== 1 ? 's' : ''}`
            const deliveredInGroup = group.orders.filter(o => o.status === 'delivered')
            const deliveredCount = deliveredInGroup.length
            const creditBalance = group.orders[0]?.member?.credit_balance ?? 0
            const closePreview =
              mode === 'toClose' && deliveredCount > 0 && creditBalance > 0
                ? computeMemberCloseCredits(
                    deliveredInGroup.map(o => ({
                      grossTotal: orderGrossTotal(o.order_items),
                      storedCredit: orderCreditApplied(o.credit_applied),
                    })),
                    creditBalance,
                  )
                : null
            const isNotifying = notifyingMemberId === group.memberId
            const isClosingMember = closingMemberId === group.memberId

            return (
              <details
                key={group.memberId}
                className={`${accordionStyles.card} admin-order-group`}
              >
                <summary
                  className={`${accordionStyles.cardSummary} admin-order-group__summary`}
                  aria-label={`${group.memberName}, ${orderLabel}, CHF ${groupTotal.toFixed(2)}, afficher les commandes`}
                >
                  <div className="admin-order-group__lead">
                    <span className="admin-order-group__name">{group.memberName}</span>
                    {group.memberEmail && (
                      <span className="admin-order-group__email">{group.memberEmail}</span>
                    )}
                    <span className="admin-order-group__meta">
                      {closePreview
                        ? `${orderLabel} · CHF ${closePreview.totalGross.toFixed(2)} produits · − CHF ${closePreview.totalCreditApplied.toFixed(2)} avoir · CHF ${closePreview.totalPayable.toFixed(2)} à payer`
                        : `${orderLabel} · CHF ${groupTotal.toFixed(2)}`}
                    </span>
                    {closePreview && creditBalance > 0 && (
                      <span className="admin-order-group__credit-hint">
                        Avoir membre CHF {creditBalance.toFixed(2)} — déduit sur le total à la clôture
                      </span>
                    )}
                    <ul className="admin-order-group__chips" aria-label="Fournisseurs">
                      {group.orders.map(order => (
                        <li key={order.id} className="admin-order-group__chip" title={order.supplier?.name ?? undefined}>
                          {order.supplier?.name ?? 'Fournisseur inconnu'}
                        </li>
                      ))}
                    </ul>
                    {(deliveredCount > 0 && (mode === 'toClose' || (mode === 'history' && filterStatus === 'delivered'))) && (
                      <div className="admin-order-group__actions">
                        {(mode === 'toClose' || (mode === 'history' && filterStatus === 'delivered')) && (
                          <button
                            type="button"
                            className="admin-btn admin-order-group__btn admin-order-group__btn--notify"
                            disabled={isNotifying || isClosingMember}
                            onClick={e => {
                              e.preventDefault()
                              void notifyMemberDelivery(group.memberId, group.memberName, deliveredCount)
                            }}
                          >
                            {isNotifying ? 'Envoi…' : '✉ Email retrait'}
                          </button>
                        )}
                        {mode === 'toClose' && deliveredCount > 0 && (
                          <button
                            type="button"
                            className="admin-btn admin-order-group__btn admin-order-group__btn--add"
                            disabled={isClosingMember || isNotifying}
                            onClick={e => {
                              e.preventDefault()
                              setAddingProductMemberId(
                                addingProductMemberId === group.memberId ? null : group.memberId,
                              )
                            }}
                          >
                            {addingProductMemberId === group.memberId ? 'Fermer ajout' : '+ Produit'}
                          </button>
                        )}
                        {mode === 'toClose' && deliveredCount > 0 && (
                          <button
                            type="button"
                            className="admin-btn admin-order-group__btn admin-order-group__btn--close"
                            disabled={isClosingMember || isNotifying}
                            onClick={e => {
                              e.preventDefault()
                              void closeMemberOrders(group.memberId, group.memberName, deliveredCount)
                            }}
                          >
                            {isClosingMember ? 'Clôture…' : `✓ Clôturer tout (${deliveredCount})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <AccordionChevron />
                </summary>

                <div className={`${accordionStyles.panel} ${accordionStyles.panelInner} admin-order-group__orders`}>
                {addingProductMemberId === group.memberId && deliveredInGroup[0] && (
                  <AdminAddProductAtClosure
                    memberId={group.memberId}
                    contextOrderId={deliveredInGroup[0].id}
                    memberName={group.memberName}
                    onAdded={() => void fetchOrders(showArchived)}
                    onClose={() => setAddingProductMemberId(null)}
                  />
                )}
                {group.orders.map(order => {
            const st         = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.confirmed
            const memberName = getMemberName(order)
            const isUpdating = updating === order.id

            return (
              <details
                key={order.id}
                className={accordionStyles.card}
                style={{
                  opacity: isUpdating ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                  background: order.archived_at ? '#f9fafb' : undefined,
                }}
              >
                {/* ── En-tête cliquable (résumé) ── */}
                <summary
                  className={`${accordionStyles.cardSummary} ${accordionStyles.cardSummaryGrid}`}
                  aria-label={`Commande ${memberName}, ${order.supplier?.name ?? 'fournisseur'}, afficher le détail`}
                >
                  {/* Colonne gauche : fournisseur + date */}
                  <div style={{ display: 'grid', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#DC7F00' }}>
                        {order.supplier?.name ?? 'Fournisseur inconnu'}
                      </span>
                      <span style={{ opacity: 0.45, fontSize: '0.76rem' }}>
                        {SUPPLIER_TYPE_LABELS[order.supplier?.type ?? ''] ?? ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', opacity: 0.45 }}>
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>

                  {/* Colonne droite : badge statut + montant */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    {order.archived_at && (
                      <span style={{
                        background: '#f3f4f6',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        borderRadius: 999, padding: '0.18rem 0.65rem',
                        fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        Archivée
                      </span>
                    )}
                    <span style={{
                      background: st.bg, color: st.color,
                      border: `1px solid ${st.border}22`,
                      borderRadius: 999, padding: '0.18rem 0.65rem',
                      fontSize: '0.78rem', fontWeight: 600,
                      maxWidth: '100%',
                      textAlign: 'center',
                    }}>
                      {st.label}
                    </span>
                    <AdminOrderTotals
                      items={order.order_items}
                      total={order.total}
                      creditApplied={order.credit_applied}
                      status={order.status}
                      compact
                    />
                  </div>
                  <AccordionChevron />
                </summary>

                {/* ── Contenu déplié ── */}
                <div className={`${accordionStyles.panel} ${accordionStyles.panelInner}`}>
                  {/* Email du membre */}
                  {order.member?.email && (
                    <p style={{ margin: '0 0 0.9rem', fontSize: '0.8rem', opacity: 0.5 }}>
                      ✉ {order.member.email}
                    </p>
                  )}

                  {(order.status === 'confirmed' || order.status === 'delivered') && order.order_items.length > 0 && (
                    <p style={{
                      margin: '0 0 0.85rem',
                      padding: '0.55rem 0.75rem',
                      background: order.status === 'delivered' ? '#e3f2fd' : '#fff8ed',
                      border: `1px solid ${order.status === 'delivered' ? '#90caf9' : '#ffe082'}`,
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      color: order.status === 'delivered' ? '#1565c0' : '#92400e',
                      lineHeight: 1.45,
                    }}>
                      {order.status === 'delivered'
                        ? <>Commande modifiable jusqu&apos;à <strong>Clôturer</strong> — retrait ou <strong>+ Produit</strong> (admin, catalogue entier, 1 unité sans majoration). Avoir déduit à la clôture groupée.</>
                        : <>Produit indisponible ? <strong>Retirer</strong> — total recalculé, email au membre.</>}
                    </p>
                  )}

                  {/* Lignes produits — style panier */}
                  <div style={{ marginBottom: '1rem' }}>
                    {order.order_items.map(item => {
                      const lineTotal = item.quantity * item.unit_price
                      const isRemoving = removingItemId === item.id
                      const canRemove = order.status === 'confirmed' || order.status === 'delivered'

                      return (
                        <div key={item.id} className={`${lineStyles.orderLine} ${lineStyles.orderLineAdmin}`}>
                          <div className={lineStyles.lineInfo}>
                            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.product?.name ?? '—'}</span>
                            {item.added_at_closure && (
                              <span className={lineStyles.closureAddBadge}>{CLOSURE_ADD_LINE_LABEL}</span>
                            )}
                            {item.product?.supplier_ref && (
                              <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.45, fontFamily: 'monospace' }}>
                                Réf. {item.product.supplier_ref}
                              </span>
                            )}
                          </div>

                          <div className={lineStyles.lineMeta}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                              {item.quantity} {item.product?.unit}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.78rem', opacity: 0.55 }}>
                              CHF {item.unit_price.toFixed(2)} / unité
                            </span>
                            <span style={{ display: 'block', fontWeight: 700, marginTop: '0.15rem' }}>
                              CHF {lineTotal.toFixed(2)}
                            </span>
                          </div>

                          {canRemove ? (
                            <button
                              type="button"
                              className={lineStyles.removeBtn}
                              disabled={isRemoving || isUpdating}
                              onClick={e => {
                                e.preventDefault()
                                void cancelOrderItem(order.id, item)
                              }}
                              aria-label={`Retirer ${item.product?.name ?? 'produit'}`}
                            >
                              {isRemoving ? '…' : '✕ Retirer'}
                            </button>
                          ) : (
                            <span style={{ width: 72 }} aria-hidden />
                          )}
                        </div>
                      )
                    })}

                    <div style={{
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem',
                      borderTop: '2px solid rgba(16,24,40,0.1)',
                    }}>
                      <AdminOrderTotals
                        items={order.order_items}
                        total={order.total}
                        creditApplied={order.credit_applied}
                        status={order.status}
                      />
                    </div>
                  </div>

                  {/* Boutons de changement de statut */}
                  <div style={{
                    display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                    paddingTop: '0.8rem',
                    borderTop: '1px solid rgba(16,24,40,0.06)',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.55, marginRight: '0.15rem' }}>
                      Changer le statut :
                    </span>
                    {order.status === 'closed' && (
                      <span style={{
                        padding: '0.28rem 0.85rem',
                        borderRadius: 999,
                        border: `1px solid ${STATUS_CONFIG.closed.border}`,
                        background: STATUS_CONFIG.closed.bg,
                        color: STATUS_CONFIG.closed.color,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}>
                        Clôturée
                      </span>
                    )}

                    {order.status !== 'closed' && Object.entries(STATUS_CONFIG)
                      .filter(([key]) => key !== 'closed')
                      .map(([key, cfg]) => {
                      const isCurrent = order.status === key
                      const disabled =
                        isCurrent ||
                        isUpdating ||
                        order.status === 'closed' ||
                        (key === 'confirmed' && order.status === 'delivered')
                      return (
                        <button
                          key={key}
                          onClick={e => { e.preventDefault(); if (!disabled) updateStatus(order.id, key) }}
                          disabled={disabled}
                          style={{
                            padding: '0.28rem 0.85rem',
                            borderRadius: 999,
                            border: `1px solid ${isCurrent ? cfg.border : '#ddd'}`,
                            background: isCurrent ? cfg.bg : '#fff',
                            color: isCurrent ? cfg.color : '#555',
                            fontSize: '0.8rem',
                            fontWeight: isCurrent ? 700 : 400,
                            cursor: isCurrent || isUpdating ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                    {isUpdating && (
                      <span style={{ fontSize: '0.78rem', opacity: 0.45 }}>Mise à jour…</span>
                    )}

                    {mode === 'history' && order.archived_at && (
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault()
                          void toggleOrderArchive(order, true)
                        }}
                        disabled={archiving}
                        style={{
                          marginLeft: 'auto',
                          padding: '0.28rem 0.85rem',
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          background: '#fff',
                          fontSize: '0.78rem',
                          cursor: archiving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Restaurer
                      </button>
                    )}

                    {mode === 'history' && !order.archived_at && order.status === 'closed' && (
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault()
                          void toggleOrderArchive(order, false)
                        }}
                        disabled={archiving}
                        style={{
                          marginLeft: 'auto',
                          padding: '0.28rem 0.85rem',
                          borderRadius: 8,
                          border: '1px solid #c7d2fe',
                          background: '#eef2ff',
                          color: '#4338ca',
                          fontSize: '0.78rem',
                          cursor: archiving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Archiver
                      </button>
                    )}
                  </div>
                </div>
              </details>
            )
                })}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AggregatedSummaryPanel({
  supplierName,
  lines,
  orderCount,
  totalAmount,
  canRemove,
  removingKey,
  onRemoveLine,
}: {
  supplierName: string
  lines: AggregatedExportLine[]
  orderCount: number
  totalAmount: number
  canRemove: boolean
  removingKey: string | null
  onRemoveLine: (line: AggregatedExportLine) => void
}) {
  return (
    <section className="admin-recap-panel">
      <div className="admin-recap-panel__head">
        <div>
          <p className="admin-recap-panel__kicker">Récapitulatif groupé</p>
          <h2 className="admin-recap-panel__title">{supplierName}</h2>
          <p className="admin-recap-panel__meta">
            {orderCount} commande{orderCount > 1 ? 's' : ''} · {lines.length} article{lines.length > 1 ? 's' : ''} — quantités additionnées par n° d&apos;article
          </p>
        </div>
        <div className="admin-recap-panel__total">
          <p className="admin-subtle admin-recap-panel__total-label">Total produits</p>
          <p className="admin-recap-panel__total-amount">CHF {totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="admin-recap-panel__body">
        <table className="admin-recap-table">
          <caption className="admin-recap-table__caption">
            Récapitulatif des articles à commander — prêt à copier-coller
          </caption>
          <thead>
            <tr>
              <th scope="col">N° article</th>
              <th scope="col">Désignation</th>
              <th scope="col" className="admin-recap-table__num">Qté totale</th>
              <th scope="col" className="admin-recap-table__num">P.U.</th>
              <th scope="col" className="admin-recap-table__num">Total</th>
              {canRemove && <th scope="col" className="admin-recap-table__action">Retrait</th>}
            </tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const lineKey = line.articleRef || line.product
              const isRemoving = removingKey === lineKey
              return (
                <tr key={`${line.articleRef}-${line.product}`}>
                  <td className="admin-recap-table__ref">{line.articleRef || '—'}</td>
                  <td>{line.product}</td>
                  <td className="admin-recap-table__num admin-recap-table__qty">
                    {line.totalQty} {line.unit}
                  </td>
                  <td className="admin-recap-table__num admin-recap-table__muted">
                    CHF {line.unitPrice.toFixed(2)}
                  </td>
                  <td className="admin-recap-table__num admin-recap-table__amount">
                    CHF {line.totalAmount.toFixed(2)}
                  </td>
                  {canRemove && (
                    <td className="admin-recap-table__action">
                      <button
                        type="button"
                        className="admin-recap-remove"
                        disabled={isRemoving || line.orderItemIds.length === 0}
                        onClick={() => onRemoveLine(line)}
                        aria-label={`Retirer ${line.product} de toutes les commandes`}
                      >
                        {isRemoving ? '…' : '✕ Retirer'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={canRemove ? 4 : 4}>Total fournisseur</td>
              <td className="admin-recap-table__num admin-recap-table__amount">
                CHF {totalAmount.toFixed(2)}
              </td>
              {canRemove && <td />}
            </tr>
          </tfoot>
        </table>
        <p className="admin-recap-panel__hint">
          {canRemove
            ? 'Retirer une ligne met à jour toutes les commandes concernées (email au membre). Disponible en « À traiter » et « À clôturer » uniquement.'
            : 'Même liste dans l\'export Excel. Retrait possible en « À traiter » ou « À clôturer ».'}
        </p>
      </div>
    </section>
  )
}
