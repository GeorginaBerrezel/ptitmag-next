import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com', // email de test
]

/**
 * Layout protégé admin : accessible uniquement aux comptes listés dans ADMIN_EMAILS.
 * Redirige vers /connexion si non connecté, vers l'accueil si connecté mais non admin.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getUser()

  if (!user) {
    redirect(`/${locale}/connexion?next=/${locale}/admin/import`)
  }

  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect(`/${locale}`)
  }

  return (
    <div>
      <div style={{
        background: '#1a1a2e',
        color: '#fff',
        padding: '0.5rem 1rem',
        fontSize: '0.8rem',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, opacity: 0.9 }}>⚙ Admin</span>
        <a href={`/${locale}/admin/import`} style={{ color: '#DC7F00', textDecoration: 'none', fontWeight: 600 }}>
          Import produits
        </a>
        <a href={`/${locale}/mon-compte`} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Retour au site
        </a>
      </div>
      {children}
    </div>
  )
}
