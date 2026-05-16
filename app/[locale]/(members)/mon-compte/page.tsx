import { getProfile, getMyOrders } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'
import SignOutButton from './SignOutButton'
import ProfileHeader from './ProfileHeader'

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  trial:  { label: "Période d'essai", bg: '#fff8e6', color: '#DC7F00' },
  member: { label: 'Adhérent·e',      bg: '#e8f5e9', color: '#2e7d32' },
  admin:  { label: 'Administrateur·rice', bg: '#e3f2fd', color: '#1565c0' },
}

const ORDER_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Brouillon',  bg: '#f3f4f6', color: '#374151' },
  confirmed: { label: 'Confirmée', bg: '#fff8e6', color: '#DC7F00' },
  delivered: { label: 'Livrée',    bg: '#e3f2fd', color: '#1565c0' },
  cancelled: { label: 'Annulée',   bg: '#fdecea', color: '#c0392b' },
}

const SUPPLIER_TYPE: Record<string, string> = {
  local:         'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre:         'Autre',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonComptePage() {
  const [profile, orders] = await Promise.all([getProfile(), getMyOrders()])

  const activeOrders    = orders.filter(o => o.status !== 'cancelled')
  const confirmedOrders = orders.filter(o => o.status === 'confirmed')
  const totalSpent      = activeOrders.reduce((s, o) => s + o.total, 0)

  const memberStatus = STATUS_LABELS[profile?.status ?? 'trial'] ?? STATUS_LABELS.trial

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: 700 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', color: 'rgba(16,24,40,0.4)', marginBottom: '1.5rem',
      }}>
        <span>Accueil</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Mon compte</span>
      </nav>

      <div style={{ display: 'grid', gap: '1rem' }}>

        {/* ── Profil ── */}
        {/* ProfileHeader gère l'avatar + pseudo éditable */}
        <ProfileHeader profile={profile} />

        {/* Barre d'info compacte : statut + email + bouton commander */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 14,
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          {/* Badge statut */}
          <span style={{
            background: memberStatus.bg,
            color: memberStatus.color,
            borderRadius: 999,
            padding: '0.2rem 0.75rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            {memberStatus.label}
          </span>

          {/* Email */}
          {profile?.email && (
            <span style={{ fontSize: '0.83rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ✉ {profile.email}
            </span>
          )}

          {/* CTA commander — aligné à droite */}
          <Link
            href="/commandes"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#DC7F00',
              color: '#fff',
              borderRadius: 8,
              padding: '0.4rem 1rem',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
          >
            + Commander
          </Link>
        </div>

        {/* ── Mes commandes ── */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 16,
          padding: '1.25rem',
        }}>

          {/* En-tête avec stats */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1rem',
            flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Mes commandes</h2>

            {orders.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                {confirmedOrders.length > 0 && (
                  <span style={{ color: '#DC7F00', fontWeight: 700 }}>
                    {confirmedOrders.length} en attente
                  </span>
                )}
                <span style={{ opacity: 0.5 }}>
                  {activeOrders.length} commande{activeOrders.length !== 1 ? 's' : ''}
                  {' · '}CHF {totalSpent.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Liste vide */}
          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🛒</p>
              <p style={{ margin: '0 0 1.25rem', opacity: 0.6 }}>
                Vous n&apos;avez pas encore passé de commande.
              </p>
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
            </div>
          )}

          {/* Accordéon des commandes */}
          {orders.length > 0 && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {orders.map(order => {
                const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.draft

                return (
                  <details
                    key={order.id}
                    style={{
                      border: '1px solid rgba(16,24,40,0.08)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {/* ── Résumé sur une seule ligne ── */}
                    <summary style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.85rem 1rem',
                      cursor: 'pointer',
                      listStyle: 'none',
                      background: '#fafafa',
                      flexWrap: 'wrap',
                    }}>
                      {/* Fournisseur + type */}
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.93rem' }}>
                          {order.supplier?.name ?? 'Fournisseur inconnu'}
                        </span>
                        <span style={{ marginLeft: '0.4rem', opacity: 0.4, fontSize: '0.76rem' }}>
                          {SUPPLIER_TYPE[order.supplier?.type ?? ''] ?? ''}
                        </span>
                      </div>

                      {/* Date + statut + montant */}
                      <div style={{
                        display: 'flex', gap: '0.5rem',
                        alignItems: 'center', flexShrink: 0, flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '0.76rem', opacity: 0.45, whiteSpace: 'nowrap' }}>
                          {formatDate(order.created_at)}
                        </span>
                        <span style={{
                          background: st.bg, color: st.color,
                          borderRadius: 999, padding: '0.15rem 0.6rem',
                          fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {st.label}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.93rem', whiteSpace: 'nowrap' }}>
                          CHF {order.total.toFixed(2)}
                        </span>
                      </div>
                    </summary>

                    {/* ── Détail des produits ── */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderTop: '1px solid rgba(16,24,40,0.06)',
                      overflowX: 'auto',
                    }}>
                      <table style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: '0.875rem', minWidth: 300,
                      }}>
                        <thead>
                          <tr style={{ opacity: 0.45 }}>
                            <th style={{ textAlign: 'left', fontWeight: 500, paddingBottom: '0.4rem' }}>Produit</th>
                            <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: '0.4rem' }}>Qté</th>
                            <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: '0.4rem' }}>P.U.</th>
                            <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: '0.4rem' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.order_items.map(item => (
                            <tr key={item.id} style={{ borderTop: '1px solid rgba(16,24,40,0.05)' }}>
                              <td style={{ padding: '0.35rem 0' }}>{item.product?.name ?? '—'}</td>
                              <td style={{ textAlign: 'right', padding: '0.35rem 0', opacity: 0.7 }}>
                                {item.quantity} {item.product?.unit}
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.35rem 0', opacity: 0.55 }}>
                                CHF {item.unit_price.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.35rem 0', fontWeight: 600 }}>
                                CHF {(item.quantity * item.unit_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid rgba(16,24,40,0.1)' }}>
                            <td colSpan={3} style={{ paddingTop: '0.5rem', fontWeight: 600, opacity: 0.65 }}>
                              Total commande
                            </td>
                            <td style={{ textAlign: 'right', paddingTop: '0.5rem', fontWeight: 800 }}>
                              CHF {order.total.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <div style={{ marginTop: '0.5rem' }}>
          <SignOutButton />
        </div>

      </div>
    </div>
  )
}
