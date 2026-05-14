import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth'

/**
 * Layout protégé : toutes les pages dans (members) nécessitent une session active.
 * Si l'utilisateur n'est pas connecté, il est redirigé vers /connexion.
 * CartProvider est dans le layout de locale (global).
 */
export default async function MembersLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const user = await getUser()

  if (!user) {
    redirect(`/${params.locale}/connexion`)
  }

  return <>{children}</>
}
