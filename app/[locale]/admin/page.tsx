'use client'

import { use, useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthData = {
  month: string
  label: string
  count: number
  revenue: number
}

type RecentOrder = {
  id: string
  status: string
  total: number
  created_at: string
  memberName: string
  supplierName: string
}

type RecentMember = {
  id: string
  status: string
  created_at: string | null
  name: string
}

type DashboardData = {
  memberStats:   { total: number; trial: number; member: number }
  orderStats:    { confirmed: number; delivered: number; cancelled: number; total: number; revenue: number }
  monthlyData:   MonthData[]
  recentOrders:  RecentOrder[]
  recentMembers: RecentMember[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmée', color: '#DC7F00', bg: '#fff8e6' },
  delivered: { label: 'Livrée',    color: '#1565c0', bg: '#e3f2fd' },
  cancelled: { label: 'Annulée',   color: '#c0392b', bg: '#fdecea' },
}

const MEMBER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  trial:  { label: 'En essai',   color: '#DC7F00', bg: '#fff8e6' },
  member: { label: 'Adhérent·e', color: '#2e7d32', bg: '#e8f5e9' },
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'short',
  })
}

// ─── Graphique en barres (CSS pur, sans bibliothèque) ─────────────────────────

function MonthlyChart({ data }: { data: MonthData[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      {/* Barres */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
        height: 100,
        paddingBottom: '0.25rem',
      }}>
        {data.map((m, i) => {
          const isCurrentMonth = i === data.length - 1
          const heightPct = maxCount > 0 ? (m.count / maxCount) * 100 : 0
          return (
            <div
              key={m.month}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {/* Valeur au-dessus */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: m.count > 0 ? 700 : 400,
                color: isCurrentMonth ? '#DC7F00' : 'rgba(16,24,40,0.5)',
                minHeight: '1em',
              }}>
                {m.count > 0 ? m.count : ''}
              </span>

              {/* Barre */}
              <div style={{
                width: '100%',
                height: `${Math.max(heightPct, m.count > 0 ? 8 : 3)}%`,
                minHeight: m.count > 0 ? 6 : 3,
                background: isCurrentMonth
                  ? '#DC7F00'
                  : m.count > 0
                    ? '#1a1a2e'
                    : '#e0e0e0',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.4s ease',
                opacity: m.count === 0 ? 0.3 : 1,
              }} />
            </div>
          )
        })}
      </div>

      {/* Axe X : labels des mois */}
      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(16,24,40,0.08)', paddingTop: '0.4rem' }}>
        {data.map((m, i) => {
          const isCurrentMonth = i === data.length - 1
          return (
            <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{
                fontSize: '0.65rem',
                color: isCurrentMonth ? '#DC7F00' : 'rgba(16,24,40,0.45)',
                fontWeight: isCurrentMonth ? 700 : 400,
                whiteSpace: 'nowrap',
              }}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)

  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) {
        setError('Impossible de charger le tableau de bord.')
        setLoading(false)
        return
      }
      setData(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', maxWidth: 960 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Tableau de bord</span>
      </nav>

      <h1 style={{ margin: '0 0 0.2rem' }}>Tableau de bord</h1>
      <p style={{ opacity: 0.55, margin: '0 0 1.75rem', fontSize: '0.85rem' }}>
        Vue d&apos;ensemble de l&apos;activité du p&apos;tit mag.
      </p>

      {/* Chargement */}
      {loading && (
        <p style={{ textAlign: 'center', opacity: 0.5, padding: '4rem 0' }}>
          Chargement…
        </p>
      )}

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c6c6', borderRadius: 10, padding: '1rem', color: '#c0392b' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ── KPI principaux ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}>
            {[
              {
                label: 'Commandes à traiter',
                value: data.orderStats.confirmed,
                color: '#DC7F00',
                highlight: data.orderStats.confirmed > 0,
                icon: '⚡',
                href: `/${locale}/admin/commandes`,
              },
              {
                label: 'Membres en essai',
                value: data.memberStats.trial,
                color: '#5c6bc0',
                highlight: data.memberStats.trial > 0,
                icon: '👤',
                href: `/${locale}/admin/membres`,
              },
              {
                label: 'Total adhérent·e·s',
                value: data.memberStats.member,
                color: '#2e7d32',
                highlight: false,
                icon: '✓',
                href: `/${locale}/admin/membres`,
              },
              {
                label: 'CA total (CHF)',
                value: data.orderStats.revenue.toFixed(0),
                color: '#1a1a2e',
                highlight: false,
                icon: '💰',
                href: null,
              },
            ].map(kpi => (
              <div
                key={kpi.label}
                style={{
                  background: '#fff',
                  border: `1px solid ${kpi.highlight ? '#DC7F0030' : 'rgba(16,24,40,0.08)'}`,
                  borderRadius: 14,
                  padding: '1rem 1.1rem',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <p style={{ margin: '0 0 0.15rem', fontSize: '1.7rem' }}>{kpi.icon}</p>
                <p style={{ margin: '0 0 0.2rem', fontSize: '1.5rem', fontWeight: 800, color: kpi.color }}>
                  {kpi.value}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
                  {kpi.label}
                </p>
                {kpi.href && (
                  <a
                    href={kpi.href}
                    aria-label={`Voir ${kpi.label}`}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 14,
                      opacity: 0, cursor: 'pointer',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── Grille principale : graphique + raccourcis ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>

            {/* Graphique mensuel */}
            <div style={{
              background: '#fff',
              border: '1px solid rgba(16,24,40,0.08)',
              borderRadius: 14, padding: '1.25rem',
              gridColumn: 'span 2',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem', fontWeight: 700 }}>
                    Commandes par mois
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.5 }}>
                    6 derniers mois · hors annulées
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <span style={{ color: '#DC7F00', fontWeight: 700 }}>■ Mois en cours</span>
                  <span style={{ color: '#1a1a2e', fontWeight: 700 }}>■ Mois passés</span>
                </div>
              </div>
              <MonthlyChart data={data.monthlyData} />
            </div>
          </div>

          {/* ── Deux colonnes : commandes récentes + membres récents ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}>

            {/* Commandes récentes */}
            <div style={{
              background: '#fff',
              border: '1px solid rgba(16,24,40,0.08)',
              borderRadius: 14, padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Commandes récentes</h3>
                <Link
                  href="/admin/commandes"
                  locale={locale}
                  style={{ fontSize: '0.78rem', color: '#DC7F00', textDecoration: 'none', fontWeight: 600 }}
                >
                  Voir tout →
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <p style={{ opacity: 0.45, fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
                  Aucune commande pour l&apos;instant.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {data.recentOrders.map(order => {
                    const st = STATUS_LABELS[order.status] ?? STATUS_LABELS.confirmed
                    return (
                      <div key={order.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.6rem 0.75rem', background: '#f8f9fa',
                        borderRadius: 8, gap: '0.5rem', flexWrap: 'wrap',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.memberName}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
                            {order.supplierName} · {formatDateShort(order.created_at)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                          <span style={{
                            background: st.bg, color: st.color,
                            borderRadius: 999, padding: '0.1rem 0.5rem',
                            fontSize: '0.72rem', fontWeight: 700,
                          }}>
                            {st.label}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                            CHF {(order.total as number).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Membres récents */}
            <div style={{
              background: '#fff',
              border: '1px solid rgba(16,24,40,0.08)',
              borderRadius: 14, padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Membres récents</h3>
                <Link
                  href="/admin/membres"
                  locale={locale}
                  style={{ fontSize: '0.78rem', color: '#5c6bc0', textDecoration: 'none', fontWeight: 600 }}
                >
                  Voir tout →
                </Link>
              </div>
              {data.recentMembers.length === 0 ? (
                <p style={{ opacity: 0.45, fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
                  Aucun membre pour l&apos;instant.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {data.recentMembers.map(member => {
                    const st = MEMBER_STATUS[member.status] ?? MEMBER_STATUS.trial
                    const initial = member.name[0]?.toUpperCase() ?? '?'
                    return (
                      <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.75rem', background: '#f8f9fa', borderRadius: 8,
                      }}>
                        {/* Avatar lettre */}
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: '#e0e0e0', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 700, color: '#555',
                        }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.name}
                          </p>
                          {member.created_at && (
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
                              Inscrit·e le {formatDateShort(member.created_at)}
                            </p>
                          )}
                        </div>
                        <span style={{
                          background: st.bg, color: st.color,
                          borderRadius: 999, padding: '0.1rem 0.5rem',
                          fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Raccourcis rapides ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.5rem',
          }}>
            {[
              { href: '/admin/commandes', label: 'Gérer les commandes', icon: '📦', desc: `${data.orderStats.confirmed} à traiter`, color: '#DC7F00' },
              { href: '/admin/membres',   label: 'Gérer les membres',   icon: '👥', desc: `${data.memberStats.total} inscrits`,  color: '#5c6bc0' },
              { href: '/admin/import',    label: 'Importer des produits', icon: '📄', desc: 'Catalogue CSV',                    color: '#1a1a2e' },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href as '/admin/commandes' | '/admin/membres' | '/admin/import'}
                locale={locale}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  background: '#fff', border: '1px solid rgba(16,24,40,0.08)',
                  borderRadius: 12, padding: '1rem 1.1rem',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{action.icon}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{action.label}</p>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: action.color, fontWeight: 600 }}>{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
