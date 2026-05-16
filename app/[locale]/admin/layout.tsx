import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminNav from '@/components/AdminNav'

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com', // email de test
]

/**
 * Layout protégé admin : accessible uniquement aux comptes listés dans ADMIN_EMAILS.
 * Redirige vers /connexion si non connecté, vers l'accueil si connecté mais non admin.
 * Récupère en parallèle le nombre de commandes "confirmed" pour le badge du menu.
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

  // Comptage des commandes "à traiter" pour le badge dans la nav
  const admin = createAdminClient()
  const { count: confirmedCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'confirmed')

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
        <AdminNav locale={locale} confirmedCount={confirmedCount ?? 0} />
      </div>

      {children}
    </div>
  )
}
