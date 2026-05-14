import { getProfile } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'
import SignOutButton from './SignOutButton'

const STATUS_LABELS: Record<string, string> = {
  trial: 'Période d\'essai (3 mois)',
  member: 'Adhérent·e',
  admin: 'Administrateur·rice',
}

export default async function MonComptePage() {
  const profile = await getProfile()

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem', maxWidth: 600 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Mon compte</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Espace adhérent — Le p&apos;tit mag</p>

      <div style={{ display: 'grid', gap: '1rem' }}>
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
            {profile?.trial_started_at && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <dt style={{ opacity: 0.6, minWidth: 120 }}>Essai débuté</dt>
                <dd style={{ margin: 0 }}>
                  {new Date(profile.trial_started_at).toLocaleDateString('fr-CH')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(16,24,40,0.08)', borderRadius: 16, padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Commander</h2>
          <p style={{ margin: '0 0 1rem', opacity: 0.6 }}>
            Consultez les produits disponibles et passez votre commande groupée.
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
      </div>

      <div style={{ marginTop: '2rem' }}>
        <SignOutButton />
      </div>
    </main>
  )
}
