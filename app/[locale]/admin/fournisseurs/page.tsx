'use client'

import { use, useCallback, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Supplier = {
  id: string
  name: string
  type: 'local' | 'grossiste_bio' | 'autre'
  active: boolean
  productCount: number
  lastDeadline: string | null
}

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  local:         { label: 'Local',        bg: '#e8f5e9', color: '#2e7d32' },
  grossiste_bio: { label: 'Grossiste bio', bg: '#e3f2fd', color: '#1565c0' },
  autre:         { label: 'Autre',         bg: '#f3e5f5', color: '#6a1b9a' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Composant toggle ─────────────────────────────────────────────────────────

function ToggleSwitch({
  active,
  loading,
  onChange,
}: {
  active: boolean
  loading: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      title={active ? 'Désactiver ce fournisseur' : 'Activer ce fournisseur'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 44,
        height: 24,
        borderRadius: 999,
        background: loading ? '#ccc' : active ? '#2e7d32' : '#d1d5db',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        padding: 0,
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        left: active ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FournisseursPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/suppliers')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur serveur')
      const data = await res.json()
      setSuppliers(data.suppliers)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(supplier: Supplier) {
    setToggling(supplier.id)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supplier.id, active: !supplier.active }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      setSuppliers(prev =>
        prev.map(s => s.id === supplier.id ? { ...s, active: !s.active } : s)
      )
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setToggling(null)
    }
  }

  const activeCount   = suppliers.filter(s => s.active).length
  const inactiveCount = suppliers.filter(s => !s.active).length

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 760 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Fournisseurs</span>
      </nav>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Fournisseurs</h1>
          <p style={{ opacity: 0.55, fontSize: '0.9rem', margin: 0 }}>
            Gérez la visibilité des fournisseurs dans le catalogue.
          </p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{
              background: '#e8f5e9', color: '#2e7d32',
              padding: '0.3rem 0.8rem', borderRadius: 999,
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
            {inactiveCount > 0 && (
              <span style={{
                background: '#f5f5f5', color: '#888',
                padding: '0.3rem 0.8rem', borderRadius: 999,
                fontSize: '0.8rem', fontWeight: 700,
              }}>
                {inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chargement */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          Chargement…
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          background: '#fdf2f2', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Tableau */}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

          {/* Note informative */}
          <div style={{
            background: '#f0f9f4', borderRadius: 10, padding: '0.75rem 1rem',
            fontSize: '0.82rem', color: '#2d6a4f', border: '1px solid #c3e6cb',
            marginBottom: '0.75rem', lineHeight: 1.6,
          }}>
            Un fournisseur <strong>inactif</strong> n'apparaît plus dans le catalogue des membres.
            Ses produits sont conservés et réapparaissent lors de la réactivation.
          </div>

          {suppliers.map(s => {
            const badge = TYPE_BADGE[s.type] ?? TYPE_BADGE.autre
            const isToggling = toggling === s.id
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: s.active ? '#fff' : '#fafafa',
                  border: `1px solid ${s.active ? 'rgba(16,24,40,0.1)' : 'rgba(16,24,40,0.06)'}`,
                  borderRadius: 12,
                  transition: 'all 0.2s',
                  opacity: s.active ? 1 : 0.6,
                }}
              >
                {/* Toggle */}
                <ToggleSwitch
                  active={s.active}
                  loading={isToggling}
                  onChange={() => handleToggle(s)}
                />

                {/* Infos fournisseur */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '0.1rem 0.5rem', borderRadius: 999,
                      background: badge.bg, color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                    {!s.active && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        padding: '0.1rem 0.5rem', borderRadius: 999,
                        background: '#f5f5f5', color: '#999',
                      }}>
                        Inactif
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.79rem', opacity: 0.5, marginTop: '0.2rem',
                    display: 'flex', gap: '1rem', flexWrap: 'wrap',
                  }}>
                    <span>{s.productCount} produit{s.productCount > 1 ? 's' : ''} actif{s.productCount > 1 ? 's' : ''}</span>
                    <span>Dernière commande : {formatDate(s.lastDeadline)}</span>
                  </div>
                </div>

                {/* Statut textuel */}
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: s.active ? '#2e7d32' : '#999',
                  whiteSpace: 'nowrap',
                }}>
                  {isToggling ? '…' : s.active ? 'Visible' : 'Masqué'}
                </span>
              </div>
            )
          })}

          {suppliers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.45 }}>
              Aucun fournisseur trouvé.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
