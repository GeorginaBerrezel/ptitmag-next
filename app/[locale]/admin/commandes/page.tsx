'use client'

import { use, useCallback, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  product: { name: string; unit: string } | null
}

type AdminOrder = {
  id: string
  status: string
  total: number
  created_at: string
  member: { full_name: string | null; email: string | null; username: string | null } | null
  supplier: { name: string; type: string } | null
  order_items: OrderItem[]
}

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  confirmed: { label: 'Confirmée', bg: '#fff8e6', color: '#DC7F00', border: '#DC7F00' },
  delivered: { label: 'Livrée',    bg: '#e3f2fd', color: '#1565c0', border: '#1565c0' },
  cancelled: { label: 'Annulée',   bg: '#fdecea', color: '#c0392b', border: '#c0392b' },
}

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  local:         'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre:         'Autre',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(order: AdminOrder) {
  return (
    order.member?.full_name ||
    order.member?.username ||
    order.member?.email?.split('@')[0] ||
    'Membre inconnu'
  )
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
  const [mode, setMode]               = useState<'action' | 'history'>('action')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterDate, setFilterDate]         = useState('')
  const [updating, setUpdating]       = useState<string | null>(null)

  // ── Chargement des commandes ─────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/orders')
    if (!res.ok) {
      setError('Impossible de charger les commandes. Vérifie ta connexion.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ── Filtres ───────────────────────────────────────────────────────────────

  const suppliers = Array.from(
    new Set(orders.map(o => o.supplier?.name).filter(Boolean))
  ) as string[]

  const filtered = orders.filter(o => {
    // En mode "action" : on n'affiche que les commandes confirmées (à traiter)
    if (mode === 'action' && o.status !== 'confirmed') return false
    // En mode "history" : les filtres manuels s'appliquent
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

  const hasFilters = filterStatus || filterSupplier || filterDate

  function switchToHistory() {
    setMode('history')
    setFilterStatus('')
    setFilterSupplier('')
    setFilterDate('')
  }

  function switchToAction() {
    setMode('action')
    setFilterStatus('')
    setFilterSupplier('')
    setFilterDate('')
  }

  // ── Statistiques ─────────────────────────────────────────────────────────

  const stats = {
    total:       orders.length,
    confirmed:   orders.filter(o => o.status === 'confirmed').length,
    delivered:   orders.filter(o => o.status === 'delivered').length,
    cancelled:   orders.filter(o => o.status === 'cancelled').length,
    totalAmount: orders
      .filter(o => o.status !== 'cancelled')
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

  // ── Export CSV ────────────────────────────────────────────────────────────
  // Le fichier est trié par fournisseur pour faciliter la préparation des commandes groupées.

  function exportCSV() {
    const bySupplier: Record<string, {
      supplierType: string
      rows: {
        member: string; email: string
        product: string; qty: number; unit: string
        unitPrice: number; lineTotal: number
        date: string
      }[]
    }> = {}

    for (const order of filtered) {
      if (order.status === 'cancelled') continue

      const sName = order.supplier?.name ?? 'Inconnu'
      const sType = SUPPLIER_TYPE_LABELS[order.supplier?.type ?? ''] ?? ''
      if (!bySupplier[sName]) bySupplier[sName] = { supplierType: sType, rows: [] }

      for (const item of order.order_items) {
        bySupplier[sName].rows.push({
          member:    getMemberName(order),
          email:     order.member?.email ?? '',
          product:   item.product?.name ?? '—',
          qty:       item.quantity,
          unit:      item.product?.unit ?? '',
          unitPrice: item.unit_price,
          lineTotal: item.quantity * item.unit_price,
          date:      formatDate(order.created_at),
        })
      }
    }

    const lines: string[] = [
      'Fournisseur,Type,Membre,Email,Date commande,Produit,Quantité,Unité,Prix unitaire (CHF),Total ligne (CHF)',
    ]

    for (const [supplier, data] of Object.entries(bySupplier)) {
      for (const row of data.rows) {
        lines.push([
          `"${supplier}"`,
          `"${data.supplierType}"`,
          `"${row.member}"`,
          `"${row.email}"`,
          `"${row.date}"`,
          `"${row.product}"`,
          row.qty,
          `"${row.unit}"`,
          row.unitPrice.toFixed(2),
          row.lineTotal.toFixed(2),
        ].join(','))
      }
      // Ligne de total par fournisseur
      const supplierTotal = data.rows.reduce((s, r) => s + r.lineTotal, 0)
      lines.push(`"TOTAL ${supplier}",,,,,,,,,"${supplierTotal.toFixed(2)}"`)
      lines.push('') // ligne vide entre chaque fournisseur
    }

    // BOM (\uFEFF) pour que Excel ouvre l'accent correctement
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem', maxWidth: 920 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Commandes</span>
      </nav>

      {/* En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
        marginBottom: '0.35rem',
      }}>
        <div>
          <h1 style={{ margin: '0 0 0.2rem' }}>
            {mode === 'action' ? 'Commandes à traiter' : 'Historique des commandes'}
          </h1>
          <p style={{ opacity: 0.55, margin: 0, fontSize: '0.85rem' }}>
            {mode === 'action'
              ? 'Commandes en attente de traitement. Marque-les "Livrée" après distribution ou "Annulée" si besoin.'
              : 'Historique complet — utilise les filtres pour retrouver une commande passée.'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0 || loading}
          style={{
            padding: '0.6rem 1.25rem',
            background: filtered.length === 0 || loading ? '#e0e0e0' : '#1a1a2e',
            color: filtered.length === 0 || loading ? '#999' : '#fff',
            border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: '0.88rem',
            cursor: filtered.length === 0 || loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', transition: 'background 0.2s',
          }}
        >
          ↓ Exporter CSV{filtered.length > 0 ? ` (${filtered.length})` : ''}
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
          { label: 'CA semaine',  value: `CHF ${stats.totalAmount.toFixed(2)}`, color: '#2e7d32' },
        ] : [
          { label: 'Total',       value: stats.total,       color: '#1a1a2e' },
          { label: 'Confirmées',  value: stats.confirmed,   color: '#DC7F00' },
          { label: 'Livrées',     value: stats.delivered,   color: '#1565c0' },
          { label: 'Annulées',    value: stats.cancelled,   color: '#c0392b' },
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
            <p style={{ margin: 0, fontSize: '0.73rem', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Bascule de mode + filtres */}
      <div style={{
        display: 'flex', gap: '0.6rem', flexWrap: 'wrap',
        background: '#f8f9fa', borderRadius: 10,
        padding: '0.65rem 1rem', marginBottom: '1.25rem',
        border: '1px solid #e8e8e8', alignItems: 'center',
      }}>
        {/* Onglets À traiter / Historique */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
          {([
            { key: 'action',  label: '⚡ À traiter' },
            { key: 'history', label: '📋 Historique' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => tab.key === 'action' ? switchToAction() : switchToHistory()}
              style={{
                padding: '0.38rem 0.9rem',
                border: 'none',
                background: mode === tab.key ? '#1a1a2e' : '#fff',
                color: mode === tab.key ? '#fff' : '#555',
                fontWeight: mode === tab.key ? 700 : 400,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
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
              style={selectStyle}
            >
              <option value="">Tous les statuts</option>
              <option value="confirmed">Confirmées</option>
              <option value="delivered">Livrées</option>
              <option value="cancelled">Annulées</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ ...selectStyle, fontFamily: 'inherit' }}
            />
          </>
        )}

        {/* Filtre fournisseur (disponible dans les deux modes) */}
        <select
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tous les fournisseurs</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Bouton réinitialiser filtres */}
        {hasFilters && mode === 'history' && (
          <button
            onClick={() => { setFilterStatus(''); setFilterSupplier(''); setFilterDate('') }}
            style={{ ...selectStyle, background: '#fff', color: '#c0392b', border: '1px solid #ddd', cursor: 'pointer' }}
          >
            ✕ Réinitialiser
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.83rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
          {loading ? 'Chargement…' : `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* États de chargement / erreur / vide */}
      {loading && (
        <p style={{ textAlign: 'center', opacity: 0.5, padding: '4rem 0' }}>
          Chargement des commandes…
        </p>
      )}

      {error && (
        <div style={{
          background: '#fdecea', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b',
        }}>
          {error}
          <button
            onClick={fetchOrders}
            style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>
            {mode === 'action' ? '✓' : '📭'}
          </p>
          <p style={{ opacity: 0.5, margin: '0 0 1rem' }}>
            {mode === 'action'
              ? 'Aucune commande en attente — tout est à jour !'
              : hasFilters
                ? 'Aucune commande ne correspond à ces filtres.'
                : "Aucune commande dans l'historique."}
          </p>
          {mode === 'action' && (
            <button
              onClick={switchToHistory}
              style={{ ...selectStyle, cursor: 'pointer', color: '#1a1a2e', borderColor: '#1a1a2e' }}
            >
              Voir l&apos;historique complet
            </button>
          )}
        </div>
      )}

      {/* Liste des commandes */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filtered.map(order => {
            const st         = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.confirmed
            const memberName = getMemberName(order)
            const isUpdating = updating === order.id

            return (
              <details
                key={order.id}
                style={{
                  border: '1px solid rgba(16,24,40,0.09)',
                  borderRadius: 12, overflow: 'hidden',
                  opacity: isUpdating ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                  background: '#fff',
                }}
              >
                {/* ── En-tête cliquable (résumé) ── */}
                <summary style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.5rem 1rem',
                  padding: '0.85rem 1.1rem',
                  cursor: 'pointer',
                  listStyle: 'none',
                  background: '#fafafa',
                  alignItems: 'center',
                  userSelect: 'none',
                }}>
                  {/* Colonne gauche : membre + fournisseur + date */}
                  <div style={{ display: 'grid', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{memberName}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span style={{ fontWeight: 600, color: '#DC7F00', fontSize: '0.88rem' }}>
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
                    <span style={{
                      background: st.bg, color: st.color,
                      border: `1px solid ${st.border}22`,
                      borderRadius: 999, padding: '0.18rem 0.65rem',
                      fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      CHF {order.total.toFixed(2)}
                    </span>
                  </div>
                </summary>

                {/* ── Contenu déplié ── */}
                <div style={{
                  padding: '0.9rem 1.1rem',
                  borderTop: '1px solid rgba(16,24,40,0.06)',
                }}>
                  {/* Email du membre */}
                  {order.member?.email && (
                    <p style={{ margin: '0 0 0.9rem', fontSize: '0.8rem', opacity: 0.5 }}>
                      ✉ {order.member.email}
                    </p>
                  )}

                  {/* Tableau des produits */}
                  <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                    <table style={{
                      width: '100%', borderCollapse: 'collapse',
                      fontSize: '0.875rem', minWidth: 320,
                    }}>
                      <thead>
                        <tr style={{ opacity: 0.5 }}>
                          <th style={thStyle}>Produit</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Qté</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>P.U.</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.order_items.map(item => (
                          <tr key={item.id} style={{ borderTop: '1px solid rgba(16,24,40,0.05)' }}>
                            <td style={tdStyle}>{item.product?.name ?? '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              {item.quantity} {item.product?.unit}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', opacity: 0.6 }}>
                              CHF {item.unit_price.toFixed(2)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                              CHF {(item.quantity * item.unit_price).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid rgba(16,24,40,0.1)' }}>
                          <td colSpan={3} style={{ paddingTop: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                            Total commande
                          </td>
                          <td style={{ textAlign: 'right', paddingTop: '0.5rem', fontWeight: 700 }}>
                            CHF {order.total.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const isCurrent = order.status === key
                      return (
                        <button
                          key={key}
                          onClick={e => { e.preventDefault(); if (!isCurrent) updateStatus(order.id, key) }}
                          disabled={isCurrent || isUpdating}
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
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      )}
    </main>
  )
}

// ─── Styles réutilisables ────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: '0.875rem',
  background: '#fff',
  cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontWeight: 500,
  paddingBottom: '0.4rem',
}

const tdStyle: React.CSSProperties = {
  padding: '0.35rem 0',
}
