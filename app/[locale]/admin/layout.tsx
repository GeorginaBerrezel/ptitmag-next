import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'
import AdminNav from '@/components/AdminNav'

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
    redirect(`/${locale}/connexion?next=/${locale}/admin/commandes`)
  }

  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect(`/${locale}`)
  }

  return (
    <div>
      {/* Barre de navigation admin — sticky sous le header du site */}
      <div style={{
        position: 'sticky',
        top: 'var(--header-height)',
        zIndex: 80,
        background: '#0f1729',
        color: '#fff',
        height: 44,
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <AdminNav locale={locale} />
      </div>

      {children}
    </div>
  )
}
