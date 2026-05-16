import { getProducts } from '@/lib/supabase/products'
import CatalogueClient from '@/components/CatalogueClient'

export default async function CommandesPage() {
  const products = await getProducts()
  return (
    <>
      {/* Fil d'ariane — rendu côté serveur, au-dessus du catalogue client */}
      <div className="container" style={{ paddingTop: '1.25rem' }}>
        <nav aria-label="Fil d'ariane" style={breadcrumbStyle}>
          <span>Accueil</span>
          <span aria-hidden>›</span>
          <span style={crumbActiveStyle}>Catalogue</span>
        </nav>
      </div>
      <CatalogueClient products={products} />
    </>
  )
}

const breadcrumbStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.8rem',
  color: 'rgba(16,24,40,0.4)',
  marginBottom: '0.25rem',
}

const crumbActiveStyle: React.CSSProperties = {
  color: 'rgba(16,24,40,0.75)',
  fontWeight: 600,
}
