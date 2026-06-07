import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin/access'
import AdminNav from '@/components/AdminNav'

/**
 * Layout protégé admin : accessible aux comptes listés dans lib/admin/access.ts.
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

  if (!isAdminEmail(user.email)) {
    redirect(`/${locale}`)
  }

  // Badges de la nav : commandes à traiter + membres en attente (non membre)
  const admin = createAdminClient()
  const [{ count: confirmedCount }, { count: pendingNonMembre }, { count: pendingTrial }] = await Promise.all([
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'non_membre'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trial'),
  ])
  const pendingCount = (pendingNonMembre ?? 0) + (pendingTrial ?? 0)

  return (
    <div className="admin-shell" style={{ marginTop: 'calc(-1 * 1rem)', maxWidth: '100%', overflowX: 'clip' }}>
      <div className="admin-bar">
        <AdminNav locale={locale} confirmedCount={confirmedCount ?? 0} pendingCount={pendingCount ?? 0} />
      </div>

      {children}
    </div>
  )
}
