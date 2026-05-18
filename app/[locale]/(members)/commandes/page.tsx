import { getProducts } from '@/lib/supabase/products'
import CatalogueClient from '@/components/CatalogueClient'

/** Toujours relire le catalogue (masquage admin, produits désactivés). */
export const dynamic = 'force-dynamic'

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ ephemere?: string }>
}) {
  const params   = await searchParams
  const products = await getProducts()

  return (
    <CatalogueClient
      products={products}
      initialEphemere={params.ephemere === '1'}
    />
  )
}
