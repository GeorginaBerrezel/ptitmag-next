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

  // Badges de la nav : commandes à traiter + membres en phase d'essai
  // Les deux requêtes tournent en parallèle pour ne pas ralentir le chargement.
  const admin = createAdminClient()
  const [{ count: confirmedCount }, { count: trialCount }] = await Promise.all([
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trial'),
  ])

  return (
    // Le margin-top négatif annule le padding-top: 1rem de la règle globale "main",
    // pour que la barre admin soit collée au header fixe sans espace parasite.
    <div style={{ marginTop: 'calc(-1 * 1rem)' }}>
      {/* Barre de navigation admin — sticky juste sous le header du site */}
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
        <AdminNav locale={locale} confirmedCount={confirmedCount ?? 0} trialCount={trialCount ?? 0} />
      </div>

      {children}
    </div>
  )
}
