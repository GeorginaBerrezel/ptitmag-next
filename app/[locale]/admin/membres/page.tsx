'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { ADMIN_MEMBER_STATUSES, MEMBER_STATUS_LABELS, formatCotisation } from '@/lib/members/profile'
import { ADMIN_MEMBER_STATUS_REMINDER, getCotisationHint } from '@/lib/members/status-guide'

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentOrder = {
  id: string
  status: string
  total: number
  created_at: string
  supplierName: string
}

type Member = {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  postal_code: string | null
  commune: string | null
  username: string | null
  avatar_url: string | null
  status: string
  cotisation_amount: number | null
  cotisation_active: boolean
  created_at: string | null
  orderCount: number
  orderTotal: number
  lastOrderDate: string | null
  recentOrders: RecentOrder[]
}

type ApiStats = {
  totalCotisations: number
  cotisationActive: number
  nonMembre: number
  ciel: number
  terre: number
}

type AdminMemberStatus = (typeof ADMIN_MEMBER_STATUSES)[number]

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const MEMBER_STATUS = MEMBER_STATUS_LABELS

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmée', color: '#DC7F00' },
  delivered: { label: 'Livrée',    color: '#1565c0' },
  cancelled: { label: 'Annulée',   color: '#c0392b' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BUTTON_LABELS: Record<AdminMemberStatus, string> = {
  non_membre: 'Non membre',
  ciel:       'Ciel · +20 %',
  terre:      'Terre · prix juste (sans marge)',
}

function getMemberName(m: Member) {
  const fromParts = [m.first_name, m.last_name].filter(Boolean).join(' ').trim()
  return fromParts || m.full_name || m.username || m.email?.split('@')[0] || 'Membre inconnu'
}

function getInitial(m: Member) {
  return getMemberName(m)[0]?.toUpperCase() ?? '?'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatLocation(m: Member) {
  const parts = [m.postal_code, m.commune].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function cotisationHint(status: string) {
  return getCotisationHint(status)
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminMembresPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)

  const [members, setMembers]         = useState<Member[]>([])
  const [apiStats, setApiStats]       = useState<ApiStats | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | AdminMemberStatus>('')
  const [filterCommune, setFilterCommune] = useState('')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [cotisationDraft, setCotisationDraft] = useState<Record<string, { amount: string; active: boolean }>>({})

  // ── Chargement ───────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/members')
    if (!res.ok) {
      setError('Impossible de charger les membres. Vérifie ta connexion.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setMembers(data.members ?? [])
    setApiStats(data.stats ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // ── Filtres ───────────────────────────────────────────────────────────────

  const filtered = members.filter(m => {
    if (filterStatus && m.status !== filterStatus) return false
    if (filterCommune && m.commune !== filterCommune) return false
    if (search) {
      const q    = search.toLowerCase()
      const name  = getMemberName(m).toLowerCase()
      const email = (m.email ?? '').toLowerCase()
      const phone = (m.phone ?? '').toLowerCase()
      const commune = (m.commune ?? '').toLowerCase()
      const postal = (m.postal_code ?? '').toLowerCase()
      if (
        !name.includes(q) &&
        !email.includes(q) &&
        !phone.includes(q) &&
        !commune.includes(q) &&
        !postal.includes(q)
      ) return false
    }
    return true
  })

  const communeOptions = [...new Set(members.map(m => m.commune).filter(Boolean))].sort() as string[]

  // ── Statistiques ─────────────────────────────────────────────────────────

  const stats = {
    total:      members.length,
    nonMembre:  members.filter(m => m.status === 'non_membre').length,
    ciel:       members.filter(m => m.status === 'ciel').length,
    terre:      members.filter(m => m.status === 'terre').length,
    withOrders: members.filter(m => m.orderCount > 0).length,
    totalCotisations: apiStats?.totalCotisations ?? members.reduce((s, m) => s + (m.cotisation_amount ?? 0), 0),
    cotisationActive: apiStats?.cotisationActive ?? members.filter(m => m.cotisation_active).length,
  }

  // ── Mise à jour du statut ─────────────────────────────────────────────────

  async function updateStatus(memberId: string, newStatus: string) {
    const prevStatus = members.find(m => m.id === memberId)?.status
    setUpdating(memberId)

    // Mise à jour optimiste
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, status: newStatus } : m
    ))

    const res = await fetch('/api/admin/members', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ memberId, status: newStatus }),
    })

    if (!res.ok) {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, status: prevStatus ?? 'non_membre' } : m
      ))
      alert('Erreur lors de la mise à jour. Réessaie.')
    }

    setUpdating(null)
  }

  function getCotisationDraft(member: Member) {
    const draft = cotisationDraft[member.id]
    if (draft) return draft
    return {
      amount: member.cotisation_amount != null ? String(member.cotisation_amount) : '',
      active: member.cotisation_active,
    }
  }

  async function saveCotisation(memberId: string) {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const draft = getCotisationDraft(member)
    const parsed = draft.amount.trim() === '' ? null : parseFloat(draft.amount.replace(',', '.'))
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      alert('Montant invalide.')
      return
    }

    setUpdating(memberId)
    const prev = { amount: member.cotisation_amount, active: member.cotisation_active }

    setMembers(prevMembers => prevMembers.map(m =>
      m.id === memberId
        ? { ...m, cotisation_amount: parsed, cotisation_active: draft.active }
        : m
    ))

    const res = await fetch('/api/admin/members', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        memberId,
        cotisation_amount: parsed,
        cotisation_active: draft.active,
      }),
    })

    if (!res.ok) {
      setMembers(prevMembers => prevMembers.map(m =>
        m.id === memberId
          ? { ...m, cotisation_amount: prev.amount, cotisation_active: prev.active }
          : m
      ))
      alert('Erreur lors de l\'enregistrement de la cotisation.')
    } else {
      setCotisationDraft(d => {
        const next = { ...d }
        delete next[memberId]
        return next
      })
      await fetchMembers()
    }

    setUpdating(null)
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', maxWidth: 960 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Membres</span>
      </nav>

      {/* En-tête */}
      <h1 style={{ margin: '0 0 0.2rem' }}>Gestion des membres</h1>
      <p style={{ opacity: 0.55, margin: '0 0 1rem', fontSize: '0.85rem' }}>
        Consulte les profils, gère les cotisations et suis l&apos;activité.
      </p>

      {/* Rappel statuts */}
      <div style={{
        background: '#f0f7ff',
        border: '1px solid #bfdbfe',
        borderRadius: 12,
        padding: '0.85rem 1.1rem',
        marginBottom: '1.25rem',
        fontSize: '0.82rem',
        lineHeight: 1.65,
        color: '#1e3a5f',
      }}>
        <p style={{ margin: '0 0 0.45rem', fontWeight: 700 }}>Rappel des statuts</p>
        <ul style={{ margin: 0, paddingLeft: '1.15rem' }}>
          {ADMIN_MEMBER_STATUS_REMINDER.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* Statistiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem', marginBottom: '1.25rem',
      }}>
        {[
          { label: 'Total inscrits',      value: stats.total,      color: '#1a1a2e' },
          { label: 'Non membres',         value: stats.nonMembre,  color: '#4b5563', highlight: stats.nonMembre > 0 },
          { label: 'Membres Ciel',        value: stats.ciel,     color: '#1565c0' },
          { label: 'Membres Terre',       value: stats.terre,    color: '#2e7d32' },
          { label: 'Total cotisations',   value: `CHF ${stats.totalCotisations.toFixed(0)}`, color: '#5c6bc0' },
          { label: 'Cotisations actives', value: stats.cotisationActive, color: '#7b1fa2' },
          { label: 'Ont commandé',        value: stats.withOrders, color: '#DC7F00' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff',
            border: `1px solid ${'highlight' in s && s.highlight ? '#DC7F0040' : 'rgba(16,24,40,0.08)'}`,
            borderRadius: 12, padding: '0.9rem 1rem', textAlign: 'center',
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

      {/* Barre de répartition cotisés / non cotisés */}
      {stats.total > 0 && (
        <div style={{
          background: '#f8f9fa', borderRadius: 10, padding: '0.75rem 1rem',
          border: '1px solid #e8e8e8', marginBottom: '1.25rem',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '0.78rem', marginBottom: '0.45rem', opacity: 0.65,
          }}>
            <span>Répartition des statuts</span>
            <span>
              {stats.ciel} Ciel · {stats.terre} Terre · {stats.nonMembre} non membre{stats.nonMembre !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, background: '#e0e0e0', overflow: 'hidden' }}>
            {stats.ciel > 0 && (
              <div style={{
                width: `${(stats.ciel / stats.total) * 100}%`,
                background: '#1565c0',
                transition: 'width 0.6s ease',
              }} />
            )}
            {stats.terre > 0 && (
              <div style={{
                width: `${(stats.terre / stats.total) * 100}%`,
                background: '#2e7d32',
                transition: 'width 0.6s ease',
              }} />
            )}
            {stats.nonMembre > 0 && (
              <div style={{
                width: `${(stats.nonMembre / stats.total) * 100}%`,
                background: '#9ca3af',
                transition: 'width 0.6s ease',
              }} />
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.72rem', marginTop: '0.3rem', opacity: 0.55 }}>
            <span style={{ color: '#1565c0' }}>■ Ciel ({Math.round(stats.ciel / stats.total * 100)}%)</span>
            <span style={{ color: '#2e7d32' }}>■ Terre ({Math.round(stats.terre / stats.total * 100)}%)</span>
            <span style={{ color: '#4b5563' }}>■ Non membre ({Math.round(stats.nonMembre / stats.total * 100)}%)</span>
          </div>
        </div>
      )}

      {/* Barre de filtres + recherche */}
      <div style={{
        display: 'flex', gap: '0.6rem', flexWrap: 'wrap',
        background: '#f8f9fa', borderRadius: 10,
        padding: '0.65rem 1rem', marginBottom: '1.25rem',
        border: '1px solid #e8e8e8', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Rechercher nom, email, téléphone, commune…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...controlStyle, flexGrow: 1, minWidth: 200 }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as '' | AdminMemberStatus)}
          style={controlStyle}
        >
          <option value="">Tous les statuts</option>
          <option value="non_membre">Non membres</option>
          <option value="ciel">Membres Ciel</option>
          <option value="terre">Membres Terre</option>
        </select>
        {communeOptions.length > 0 && (
          <select
            value={filterCommune}
            onChange={e => setFilterCommune(e.target.value)}
            style={controlStyle}
          >
            <option value="">Toutes les communes</option>
            {communeOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {(search || filterStatus || filterCommune) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterCommune('') }}
            style={{ ...controlStyle, cursor: 'pointer', color: '#c0392b', background: '#fff' }}
          >
            ✕ Réinitialiser
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.83rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
          {loading ? 'Chargement…' : `${filtered.length} membre${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* État de chargement */}
      {loading && (
        <p style={{ textAlign: 'center', opacity: 0.5, padding: '4rem 0' }}>
          Chargement des membres…
        </p>
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          background: '#fdecea', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b',
        }}>
          {error}
          <button
            onClick={fetchMembers}
            style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Vide */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.5 }}>
          {search || filterStatus || filterCommune
            ? 'Aucun membre ne correspond à ces critères.'
            : 'Aucun membre trouvé.'}
        </div>
      )}

      {/* Liste des membres */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filtered.map(member => {
            const st         = MEMBER_STATUS[member.status] ?? MEMBER_STATUS.non_membre
            const name       = getMemberName(member)
            const location   = formatLocation(member)
            const isUpdating = updating === member.id

            return (
              <details
                key={member.id}
                style={{
                  border: '1px solid rgba(16,24,40,0.09)',
                  borderRadius: 12, overflow: 'hidden',
                  background: '#fff',
                  opacity: isUpdating ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* ── Résumé cliquable ── */}
                <summary style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto',
                  gap: '0.5rem 0.9rem',
                  padding: '0.85rem 1.1rem',
                  cursor: 'pointer',
                  listStyle: 'none',
                  background: '#fafafa',
                  alignItems: 'center',
                  userSelect: 'none',
                }}>

                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#e8e8e8', overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 700, color: '#888',
                  }}>
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitial(member)
                    }
                  </div>

                  {/* Info principale */}
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</span>
                      {member.username && member.full_name && (
                        <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>@{member.username}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.5, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {member.email && <span>✉ {member.email}</span>}
                      {member.phone && <span>📞 {member.phone}</span>}
                      {location && <span>📍 {location}</span>}
                      {member.created_at && (
                        <span>Inscrit·e le {formatDate(member.created_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Statut + compteur commandes */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    <span style={{
                      background: st.bg, color: st.color,
                      border: `1px solid ${st.border}33`,
                      borderRadius: 999, padding: '0.18rem 0.65rem',
                      fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', opacity: 0.45, whiteSpace: 'nowrap' }}>
                      {formatCotisation(member.cotisation_amount)}
                      {member.cotisation_active ? ' · actif' : member.cotisation_amount ? ' · inactif' : ''}
                    </span>
                    <span style={{ fontSize: '0.78rem', opacity: 0.45, whiteSpace: 'nowrap' }}>
                      {member.orderCount > 0
                        ? `${member.orderCount} cmd · CHF ${member.orderTotal.toFixed(2)}`
                        : 'Aucune commande'}
                    </span>
                  </div>
                </summary>

                {/* ── Contenu déplié ── */}
                <div style={{ padding: '1rem 1.1rem', borderTop: '1px solid rgba(16,24,40,0.06)' }}>

                  {/* Cotisation */}
                  <div style={{
                    display: 'grid',
                    gap: '0.65rem',
                    marginBottom: '1.25rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid rgba(16,24,40,0.06)',
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cotisation</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.55, lineHeight: 1.4 }}>
                      {cotisationHint(member.status)}
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Montant (CHF)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="ex. 30"
                        value={getCotisationDraft(member).amount}
                        onChange={e => setCotisationDraft(d => ({
                          ...d,
                          [member.id]: {
                            ...getCotisationDraft(member),
                            amount: e.target.value,
                          },
                        }))}
                        style={{ ...controlStyle, width: 100 }}
                        disabled={isUpdating}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={getCotisationDraft(member).active}
                          onChange={e => setCotisationDraft(d => ({
                            ...d,
                            [member.id]: {
                              ...getCotisationDraft(member),
                              active: e.target.checked,
                            },
                          }))}
                          disabled={isUpdating}
                        />
                        Cotisation active
                      </label>
                      <button
                        type="button"
                        onClick={() => saveCotisation(member.id)}
                        disabled={isUpdating}
                        style={{
                          ...controlStyle,
                          cursor: isUpdating ? 'default' : 'pointer',
                          background: '#1565c0',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>

                  {/* Changer le statut */}
                  <div style={{
                    display: 'flex', gap: '0.5rem', alignItems: 'center',
                    marginBottom: '1.25rem', flexWrap: 'wrap',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid rgba(16,24,40,0.06)',
                  }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Changer le statut :</span>
                    {ADMIN_MEMBER_STATUSES.map(key => {
                      const cfg       = MEMBER_STATUS[key]
                      const isCurrent = member.status === key
                      return (
                        <button
                          key={key}
                          onClick={e => { e.preventDefault(); if (!isCurrent) updateStatus(member.id, key) }}
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
                          {STATUS_BUTTON_LABELS[key]}
                        </button>
                      )
                    })}
                    {isUpdating && (
                      <span style={{ fontSize: '0.78rem', opacity: 0.45 }}>Mise à jour…</span>
                    )}
                  </div>

                  {/* Historique des commandes récentes */}
                  {member.recentOrders.length > 0 ? (
                    <div>
                      <p style={{ margin: '0 0 0.6rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Commandes récentes
                        {member.orderCount > 5 && (
                          <span style={{ fontWeight: 400, opacity: 0.5, marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                            (5 sur {member.orderCount})
                          </span>
                        )}
                      </p>
                      <div style={{ display: 'grid', gap: '0.4rem' }}>
                        {member.recentOrders.map(order => {
                          const oSt = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed
                          return (
                            <div key={order.id} style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', flexWrap: 'wrap',
                              padding: '0.5rem 0.75rem',
                              background: '#f8f9fa', borderRadius: 8,
                              fontSize: '0.83rem', gap: '0.35rem 0.75rem',
                            }}>
                              <span style={{ fontWeight: 600 }}>{order.supplierName}</span>
                              <span style={{ opacity: 0.5 }}>{formatDateShort(order.created_at)}</span>
                              <span style={{ color: oSt.color, fontWeight: 600, fontSize: '0.78rem' }}>
                                {oSt.label}
                              </span>
                              <span style={{ fontWeight: 700, marginLeft: 'auto' }}>
                                CHF {order.total.toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p style={{ opacity: 0.45, fontSize: '0.85rem', margin: 0 }}>
                      Cet·te adhérent·e n&apos;a pas encore passé de commande.
                    </p>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Styles réutilisables ────────────────────────────────────────────────────

const controlStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: '0.875rem',
  background: '#fff',
}
