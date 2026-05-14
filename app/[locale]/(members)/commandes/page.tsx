import { getProducts } from '@/lib/supabase/products'
import ProductCard from '@/components/ProductCard'
import CartBar from '@/components/CartBar'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre: 'Autre',
}

export default async function CommandesPage() {
  const products = await getProducts()

  // Grouper par catégorie
  const byCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    const cat = p.category ?? 'Autres'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <>
      <CartBar />
      <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Catalogue de commande</h1>
        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
          Sélectionnez vos produits et ajoutez-les au panier. Une commande sera créée par fournisseur.
        </p>

        {Object.keys(byCategory).length === 0 && (
          <p style={{ opacity: 0.6 }}>Aucun produit disponible pour le moment.</p>
        )}

        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              marginBottom: '1rem',
              fontSize: '1.2rem',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '0.5rem',
            }}>
              {category}
            </h2>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {items.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  )
}
