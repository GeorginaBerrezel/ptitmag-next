'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { nextOrderWindowForSupplier } from '@/lib/catalog/order-windows'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string
  name: string
  unit: string
  unit_price: number | null
  category: string | null
  is_featured: boolean
  active: boolean
}

type Supplier = {
  id: string
  name: string
  type: 'local' | 'grossiste_bio' | 'autre'
  active: boolean
  orders_open: boolean
  order_deadline: string | null
  productCount: number
}

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  local:         { label: 'Local',         bg: '#e8f5e9', color: '#2e7d32' },
  grossiste_bio: { label: 'Grossiste bio',  bg: '#e3f2fd', color: '#1565c0' },
  autre:         { label: 'Autre',          bg: '#f3e5f5', color: '#6a1b9a' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return formatSupplierOrderDeadline(iso)
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}

function formatPrice(p: number | null): string {
  if (p == null) return '—'
  return p.toFixed(2) + ' CHF'
}

// ─── Composant toggle switch ──────────────────────────────────────────────────

function ToggleSwitch({ active, loading, onChange, small }: {
  active: boolean; loading: boolean; onChange: () => void; small?: boolean
}) {
  const w = small ? 36 : 44
  const h = small ? 20 : 24
  const d = small ? 16 : 20
  return (
    <button onClick={onChange} disabled={loading} title={active ? 'Désactiver' : 'Activer'} style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center',
      width: w, height: h, borderRadius: 999,
      background: loading ? '#ccc' : active ? '#2e7d32' : '#d1d5db',
      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      padding: 0, transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', left: active ? w - d - 2 : 2,
        width: d, height: d, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Panneau produits d'un fournisseur ────────────────────────────────────────

function ProductPanel({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/products?supplier_id=${supplierId}`)
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [supplierId])

  async function handleToggleFeatured(p: Product) {
    setTogglingId(p.id)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, is_featured: !p.is_featured }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_featured: !x.is_featured } : x))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  const featured = products.filter(p => p.is_featured)
  const regular  = products.filter(p => !p.is_featured)

  return (
    <div style={{
      borderTop: '1px solid rgba(16,24,40,0.08)',
      marginTop: '0.75rem', paddingTop: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>
          Produits {!loading && `(${products.length})`}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.78rem', opacity: 0.45, padding: '0.2rem 0.4rem',
        }}>Réduire ▲</button>
      </div>

      {loading && <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>Chargement…</p>}

      {!loading && products.length === 0 && (
        <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>Aucun produit.</p>
      )}

      {!loading && products.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 320, overflowY: 'auto' }}>
          {[...featured, ...regular].map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.35rem 0.6rem', borderRadius: 7,
              background: p.is_featured ? '#fffbf0' : 'transparent',
              border: `1px solid ${p.is_featured ? '#ffe082' : 'transparent'}`,
              fontSize: '0.8rem',
            }}>
              {/* Bouton étoile is_featured */}
              <button
                onClick={() => handleToggleFeatured(p)}
                disabled={togglingId === p.id}
                title={p.is_featured ? 'Retirer de la mise en avant' : 'Mettre en avant sur la page d\'accueil'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1rem', lineHeight: 1, padding: 0, flexShrink: 0,
                  opacity: togglingId === p.id ? 0.4 : 1,
                }}
              >
                {p.is_featured ? '★' : '☆'}
              </button>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span style={{ opacity: 0.45, whiteSpace: 'nowrap' }}>{p.unit}</span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPrice(p.unit_price)}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && featured.length > 0 && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', opacity: 0.5 }}>
          ★ = affiché en avant sur la page d'accueil ({featured.length} produit{featured.length > 1 ? 's' : ''})
        </p>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FournisseursPage({ params }: { params: Promise<{ locale: string }> }) {
  use(params)

  const [suppliers, setSuppliers]       = useState<Supplier[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [toggling, setToggling]         = useState<string | null>(null)
  const [togglingOrders, setTogglingOrders] = useState<string | null>(null)
  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, string>>({})
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/suppliers')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur serveur')
      setSuppliers((await res.json()).suppliers)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleActive(s: Supplier) {
    setToggling(s.id)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))
    } catch (e) { alert((e as Error).message) }
    finally { setToggling(null) }
  }

  function getDeadlineDraft(s: Supplier): string {
    if (deadlineDrafts[s.id] !== undefined) return deadlineDrafts[s.id]
    if (s.order_deadline) return toDatetimeLocalValue(s.order_deadline)
    return toDatetimeLocalValue(nextOrderWindowForSupplier(s, Date.now()).toISOString())
  }

  async function handleToggleOrders(s: Supplier) {
    const opening = !s.orders_open
    const draft = getDeadlineDraft(s)

    if (opening && !draft) {
      alert('Indiquez un délai max de commande avant d\'ouvrir.')
      return
    }

    setTogglingOrders(s.id)
    try {
      const body: Record<string, unknown> = {
        id: s.id,
        orders_open: opening,
      }
      if (opening) {
        body.order_deadline = datetimeLocalToIso(draft)
      }

      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)

      setSuppliers(prev => prev.map(x => x.id === s.id ? {
        ...x,
        orders_open: opening,
        order_deadline: opening ? datetimeLocalToIso(draft) : x.order_deadline,
      } : x))
    } catch (e) { alert((e as Error).message) }
    finally { setTogglingOrders(null) }
  }

  async function handleSaveDeadline(s: Supplier) {
    const draft = getDeadlineDraft(s)
    if (!draft) {
      alert('Indiquez un délai.')
      return
    }

    setTogglingOrders(s.id)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: s.id,
          order_deadline: datetimeLocalToIso(draft),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuppliers(prev => prev.map(x => x.id === s.id ? {
        ...x,
        order_deadline: datetimeLocalToIso(draft),
      } : x))
    } catch (e) { alert((e as Error).message) }
    finally { setTogglingOrders(null) }
  }

  async function handleDelete(id: string) {
    setDeleting(id); setConfirmDelete(null)
    try {
      const res = await fetch(`/api/admin/suppliers?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.deleted) {
        // Suppression complète
        setSuppliers(prev => prev.filter(x => x.id !== id))
        if (expanded === id) setExpanded(null)
      } else {
        // Désactivé car produits liés à des commandes
        setSuppliers(prev => prev.map(x => x.id === id ? { ...x, active: false } : x))
        alert(data.warning)
      }
    } catch (e) { alert((e as Error).message) }
    finally { setDeleting(null) }
  }

  const activeCount   = suppliers.filter(s => s.active).length
  const inactiveCount = suppliers.filter(s => !s.active).length

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 780 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem', color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span><span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Fournisseurs</span>
      </nav>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Fournisseurs</h1>
          <p style={{ opacity: 0.55, fontSize: '0.9rem', margin: 0 }}>
            Visibilité catalogue et ouverture manuelle des commandes par fournisseur.
          </p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '0.3rem 0.8rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
            {inactiveCount > 0 && (
              <span style={{ background: '#f5f5f5', color: '#888', padding: '0.3rem 0.8rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
                {inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Chargement…</div>}

      {error && (
        <div style={{ background: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Note */}
          <div style={{ background: '#f0f9f4', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#2d6a4f', border: '1px solid #c3e6cb', marginBottom: '0.25rem', lineHeight: 1.6 }}>
            <strong>Catalogue visible</strong> → le fournisseur apparaît dans le catalogue membre.{' '}
            <strong>Commandes ouvertes</strong> → les membres peuvent commander (délai max obligatoire).{' '}
            <strong>★ Mise en avant</strong> → produit en haut de la page d&apos;accueil.
          </div>

          {suppliers.map(s => {
            const badge       = TYPE_BADGE[s.type] ?? TYPE_BADGE.autre
            const isToggling  = toggling === s.id
            const isTogglingOrders = togglingOrders === s.id
            const isDeleting  = deleting === s.id
            const isExpanded  = expanded === s.id
            const isConfirm   = confirmDelete === s.id
            const deadlineDraft = getDeadlineDraft(s)

            return (
              <div key={s.id} style={{
                padding: '1rem 1.25rem',
                background: s.active ? '#fff' : '#fafafa',
                border: `1px solid ${s.active ? 'rgba(16,24,40,0.1)' : 'rgba(16,24,40,0.06)'}`,
                borderRadius: 12,
                opacity: s.active ? 1 : 0.65,
                transition: 'all 0.2s',
              }}>
                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      {!s.active && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: '#f5f5f5', color: '#999' }}>
                          Catalogue masqué
                        </span>
                      )}
                      {s.orders_open && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: '#ecfdf5', color: '#047857' }}>
                          Commandes ouvertes
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.15rem' }}>
                      {s.productCount} produit{s.productCount > 1 ? 's' : ''}
                      {s.order_deadline && (
                        <span> · Délai commande : {formatDate(s.order_deadline)}</span>
                      )}
                    </div>

                    {/* Contrôles catalogue + commandes */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center',
                      marginTop: '0.85rem', paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(16,24,40,0.06)',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
                        <ToggleSwitch active={s.active} loading={isToggling} onChange={() => handleToggleActive(s)} small />
                        Catalogue visible
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
                        <ToggleSwitch
                          active={s.orders_open}
                          loading={isTogglingOrders}
                          onChange={() => handleToggleOrders(s)}
                          small
                        />
                        Commandes ouvertes
                      </label>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                        <input
                          type="datetime-local"
                          value={deadlineDraft}
                          onChange={e => setDeadlineDrafts(prev => ({ ...prev, [s.id]: e.target.value }))}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 7,
                            border: '1px solid rgba(16,24,40,0.15)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveDeadline(s)}
                          disabled={isTogglingOrders || !deadlineDraft}
                          style={{
                            background: '#eef2ff',
                            border: '1px solid #c7d2fe',
                            borderRadius: 7,
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#4338ca',
                          }}
                        >
                          Enregistrer délai
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>

                    {/* Voir produits */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : s.id)}
                      style={{
                        background: isExpanded ? '#f0f0f0' : 'transparent',
                        border: '1px solid rgba(16,24,40,0.12)',
                        borderRadius: 7, padding: '0.3rem 0.7rem',
                        fontSize: '0.78rem', cursor: 'pointer', color: '#444',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isExpanded ? 'Masquer ▲' : `Produits ▾`}
                    </button>

                    {/* Supprimer */}
                    {!isConfirm ? (
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        disabled={isDeleting}
                        title="Supprimer ce fournisseur et tous ses produits"
                        style={{
                          background: 'transparent', border: '1px solid rgba(192,57,43,0.25)',
                          borderRadius: 7, padding: '0.3rem 0.6rem',
                          fontSize: '0.78rem', cursor: 'pointer', color: '#c0392b',
                        }}
                      >
                        {isDeleting ? '…' : '🗑'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.73rem', color: '#c0392b', fontWeight: 600 }}>Confirmer ?</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Non
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panneau produits (expandable) */}
                {isExpanded && (
                  <ProductPanel supplierId={s.id} onClose={() => setExpanded(null)} />
                )}
              </div>
            )
          })}

          {suppliers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.45 }}>Aucun fournisseur trouvé.</div>
          )}
        </div>
      )}
    </div>
  )
}
