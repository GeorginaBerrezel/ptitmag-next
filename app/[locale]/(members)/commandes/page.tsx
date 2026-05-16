import { getProducts } from '@/lib/supabase/products'
import CatalogueClient from '@/components/CatalogueClient'

export default async function CommandesPage() {
  const products = await getProducts()
  return <CatalogueClient products={products} />
}
