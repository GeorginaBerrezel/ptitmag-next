import { getProducts } from '@/lib/supabase/products'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre: 'Autre',
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const date = new Date(deadline)
  const today = new Date()
  const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysLeft <= 3

  return (
    <span style={{
      display: 'inline-block',
      background: isUrgent ? '#fdecea' : '#f3f4f6',
      color: isUrgent ? '#c0392b' : '#374151',
      borderRadius: 999,
      padding: '0.15rem 0.6rem',
      fontSize: '0.8rem',
      fontWeight: 500,
    }}>
      Commande avant le {date.toLocaleDateString('fr-CH')}
      {isUrgent && ' ⚠️'}
    </span>
  )
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
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Catalogue de commande</h1>
      <p style={{ opacity: 0.7, marginBottom: '2.5rem' }}>
        Produits disponibles à la prochaine commande groupée.
      </p>

      {Object.keys(byCategory).length === 0 && (
        <p style={{ opacity: 0.6 }}>Aucun produit disponible pour le moment.</p>
      )}

      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>
            {category}
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {items.map(product => (
              <div
                key={product.id}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(16,24,40,0.08)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.5rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{product.name}</p>
                  {product.description && (
                    <p style={{ margin: '0 0 0.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
                      {product.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {product.supplier && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                        {product.supplier.name} · {TYPE_LABELS[product.supplier.type]}
                      </span>
                    )}
                    <DeadlineBadge deadline={product.order_deadline} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  {product.unit_price != null && (
                    <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '1.1rem' }}>
                      CHF {product.unit_price.toFixed(2)}
                      <span style={{ fontWeight: 400, fontSize: '0.85rem', opacity: 0.6 }}>
                        /{product.unit}
                      </span>
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                    min. {product.min_quantity} {product.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
