import { headers } from 'next/headers'
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
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getUser()

  if (!user) {
    const search = (await headers()).get('x-search') ?? ''
    const confirmQ = search.includes('compte_confirme=1') ? '?compte_confirme=1' : ''
    redirect(`/${locale}/connexion${confirmQ}`)
  }

  return <>{children}</>
}
