import { getCatalogueSummaries } from '@/lib/supabase/catalogue'
import CatalogueClient from '@/components/CatalogueClient'

/** Toujours relire l'index catalogue (masquage admin, produits désactivés). */
export const dynamic = 'force-dynamic'

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ ephemere?: string }>
}) {
  const params = await searchParams
  const summaries = await getCatalogueSummaries()

  return (
    <CatalogueClient
      summaries={summaries}
      initialEphemere={params.ephemere === '1'}
    />
  )
}
