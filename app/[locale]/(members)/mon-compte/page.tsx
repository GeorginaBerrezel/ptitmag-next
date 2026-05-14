import { getProfile, getMyOrders } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'
import SignOutButton from './SignOutButton'

const STATUS_LABELS: Record<string, string> = {
  trial: "Période d'essai (3 mois)",
  member: 'Adhérent·e',
  admin: 'Administrateur·rice',
}

const ORDER_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Brouillon',  bg: '#f3f4f6', color: '#374151' },
  confirmed: { label: 'Confirmée', bg: '#e8f5e9', color: '#2e7d32' },
  delivered: { label: 'Livrée',    bg: '#e3f2fd', color: '#1565c0' },
  cancelled: { label: 'Annulée',   bg: '#fdecea', color: '#c0392b' },
}

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  local: 'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre: 'Autre',
}

export default async function MonComptePage() {
  const [profile, orders] = await Promise.all([getProfile(), getMyOrders()])

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem', maxWidth: 680 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Mon compte</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Espace adhérent — Le p&apos;tit mag</p>

      <div style={{ display: 'grid', gap: '1.25rem' }}>

        {/* Informations personnelles */}
        <div style={{ background: '#fff', border: '1px solid rgba(16,24,40,0.08)', borderRadius: 16, padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Informations</h2>
          <dl style={{ display: 'grid', gap: '0.5rem', margin: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <dt style={{ opacity: 0.6, minWidth: 120 }}>Nom</dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>{profile?.full_name ?? '—'}</dd>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <dt style={{ opacity: 0.6, minWidth: 120 }}>E-mail</dt>
              <dd style={{ margin: 0 }}>{profile?.email ?? '—'}</dd>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <dt style={{ opacity: 0.6, minWidth: 120 }}>Statut</dt>
              <dd style={{ margin: 0 }}>
                <span style={{
                  display: 'inline-block',
                  background: profile?.status === 'member' ? '#e8f5e9' : '#fff8e1',
                  color: profile?.status === 'member' ? '#2e7d32' : '#e65100',
                  borderRadius: 999,
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}>
                  {STATUS_LABELS[profile?.status ?? 'trial'] ?? profile?.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Bouton commander */}
        <div style={{ background: '#fff', border: '1px solid rgba(16,24,40,0.08)', borderRadius: 16, padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Passer une commande</h2>
          <p style={{ margin: '0 0 1rem', opacity: 0.6 }}>
            Consultez les produits disponibles et ajoutez-les à votre panier.
          </p>
          <Link
            href="/commandes"
            style={{
              display: 'inline-block',
              background: '#DC7F00',
              color: '#fff',
              borderRadius: 8,
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Voir le catalogue →
          </Link>
        </div>

        {/* Historique des commandes */}
        <div style={{ background: '#fff', border: '1px solid rgba(16,24,40,0.08)', borderRadius: 16, padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Mes commandes</h2>

          {orders.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.6 }}>Aucune commande pour le moment.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {orders.map(order => {
                const st = ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.draft
                return (
                  <details key={order.id} style={{
                    border: '1px solid rgba(16,24,40,0.08)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}>
                    {/* En-tête cliquable */}
                    <summary style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '0.75rem',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      listStyle: 'none',
                      background: '#fafafa',
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>
                          {order.supplier?.name ?? 'Fournisseur inconnu'}
                        </span>
                        <span style={{ marginLeft: '0.5rem', opacity: 0.5, fontSize: '0.8rem' }}>
                          · {SUPPLIER_TYPE_LABELS[order.supplier?.type ?? ''] ?? ''}
                        </span>
                        <br />
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                          {new Date(order.created_at).toLocaleDateString('fr-CH', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span style={{
                        background: st.bg,
                        color: st.color,
                        borderRadius: 999,
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {st.label}
                      </span>
                      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        CHF {order.total.toFixed(2)}
                      </span>
                    </summary>

                    {/* Détail des produits */}
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(16,24,40,0.06)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ opacity: 0.5 }}>
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
                              <td style={{ textAlign: 'right', padding: '0.35rem 0' }}>
                                {item.quantity} {item.product?.unit}
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.35rem 0', opacity: 0.6 }}>
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
                            <td colSpan={3} style={{ paddingTop: '0.5rem', fontWeight: 600 }}>Total</td>
                            <td style={{ textAlign: 'right', paddingTop: '0.5rem', fontWeight: 700 }}>
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

      </div>

      <div style={{ marginTop: '2rem' }}>
        <SignOutButton />
      </div>
    </main>
  )
}
