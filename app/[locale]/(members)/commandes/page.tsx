import { getCatalogueSummaries } from '@/lib/supabase/catalogue'
import { getProfile } from '@/lib/supabase/auth'
import { canAccessCatalog } from '@/lib/members/profile'
import CatalogueClient from '@/components/CatalogueClient'
import CatalogueAccessPending from '@/components/CatalogueAccessPending'

/** Toujours relire l'index catalogue (masquage admin, produits désactivés). */
export const dynamic = 'force-dynamic'

export default async function CommandesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ephemere?: string; q?: string; s?: string; c?: string }>
}) {
  const { locale } = await params
  const profile = await getProfile()

  if (!profile || !canAccessCatalog(profile)) {
    return <CatalogueAccessPending locale={locale} profile={profile} />
  }

  const sp = await searchParams
  const summaries = await getCatalogueSummaries()
  const initialSummary = sp.s
    ? summaries.find(row => row.supplier.id === sp.s) ?? null
    : null
  const initialSupplierId = initialSummary?.supplier.id ?? null
  const initialCategory =
    initialSupplierId && sp.c && initialSummary?.categories.some(cat => cat.name === sp.c)
      ? sp.c
      : null

  return (
    <CatalogueClient
      summaries={summaries}
      initialEphemere={sp.ephemere === '1'}
      initialSearch={sp.q ?? ''}
      initialSupplierId={initialSupplierId}
      initialCategory={initialCategory}
    />
  )
}
