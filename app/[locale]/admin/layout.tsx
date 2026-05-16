import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'

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
        position: 'sticky',
        top: 'var(--header-height)',
        zIndex: 80,
        background: '#0f1729',
        color: '#fff',
        padding: '0.45rem 1.25rem',
        fontSize: '0.8rem',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontWeight: 700, opacity: 0.9, letterSpacing: '0.03em' }}>⚙ Admin</span>
        <Link href="/admin/import" locale={locale} style={{ color: '#DC7F00', textDecoration: 'none', fontWeight: 600 }}>
          Import produits
        </Link>
        <Link href="/mon-compte" locale={locale} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Retour au site
        </Link>
      </div>
      {children}
    </div>
  )
}
