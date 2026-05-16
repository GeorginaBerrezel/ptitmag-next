'use client'

import { useState, useMemo } from 'react'
import type { Product } from '@/lib/supabase/products'
import ProductCard from './ProductCard'
import CartBar from './CartBar'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteurs locaux',
  grossiste_bio: 'Grossistes bio',
  autre: 'Autre',
}

const TYPE_ORDER = ['local', 'grossiste_bio', 'autre']

type Props = {
  products: Product[]
  initialEphemere?: boolean
}

export default function CatalogueClient({ products, initialEphemere = false }: Props) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('tous')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('tous')
  const [ephemereOnly, setEphemereOnly] = useState(initialEphemere)

  const hasFeatured = useMemo(() => products.some(p => p.is_featured), [products])

  // Tous les fournisseurs disponibles
  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }>()
    products.forEach(p => {
      if (p.supplier && !map.has(p.supplier.id)) {
        map.set(p.supplier.id, { id: p.supplier.id, name: p.supplier.name, type: p.supplier.type })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  // Fournisseurs filtrés par type sélectionné
  const visibleSuppliers = useMemo(() => {
    if (selectedType === 'tous') return suppliers
    return suppliers.filter(s => s.type === selectedType)
  }, [suppliers, selectedType])

  // Produits filtrés par recherche + type + fournisseur + éphémères
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      if (ephemereOnly && !p.is_featured) return false
      if (!ephemereOnly && selectedType !== 'tous' && p.supplier?.type !== selectedType) return false
      if (!ephemereOnly && selectedSupplier !== 'tous' && p.supplier?.id !== selectedSupplier) return false
      if (q) {
        const haystack = [
          p.name,
          p.description,
          p.category,
          p.supplier?.name,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [products, search, selectedType, selectedSupplier, ephemereOnly])

  // Grouper les produits filtrés par fournisseur
  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: NonNullable<Product['supplier']>; items: Product[] }>()
    filtered.forEach(p => {
      if (!p.supplier) return
      if (!map.has(p.supplier.id)) {
        map.set(p.supplier.id, { supplier: p.supplier, items: [] })
      }
      map.get(p.supplier.id)!.items.push(p)
    })
    return Array.from(map.values()).sort((a, b) => a.supplier.name.localeCompare(b.supplier.name))
  }, [filtered])

  // Grouper par type → fournisseur
  const byType = useMemo(() => {
    const map = new Map<string, typeof bySupplier>()
    bySupplier.forEach(group => {
      const type = group.supplier.type
      if (!map.has(type)) map.set(type, [])
      map.get(type)!.push(group)
    })
    return map
  }, [bySupplier])

  function handleTypeClick(type: string) {
    setSelectedType(type)
    setSelectedSupplier('tous')
    setEphemereOnly(false)
  }

  function handleEphemereClick() {
    setEphemereOnly(v => !v)
    setSelectedType('tous')
    setSelectedSupplier('tous')
  }

  const totalVisible = filtered.length

  return (
    // Le marginTop négatif annule le padding-top: 1rem du <main> global,
    // pour que la CartBar soit collée au header sans espace parasite.
    // Même principe que le layout admin avec sa barre sticky.
    <div style={{ marginTop: 'calc(-1 * 1rem)' }}>
      <CartBar />
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '5rem' }}>

        {/* Fil d'ariane — placé ici, après la CartBar, avant le contenu */}
        <nav aria-label="Fil d'ariane" style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.8rem', color: 'rgba(16,24,40,0.4)', marginBottom: '1.25rem',
        }}>
          <span>Accueil</span>
          <span aria-hidden>›</span>
          <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Catalogue</span>
        </nav>

        {/* En-tête */}
        <h1 style={{ marginBottom: '0.25rem' }}>Catalogue de commande</h1>
        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
          Sélectionnez vos produits et ajoutez-les au panier. Une commande sera créée par fournisseur.
        </p>

        {/* Barre de recherche */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', opacity: 0.4, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="search"
            placeholder="Rechercher un produit, une catégorie, un fournisseur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              border: '1.5px solid rgba(16,24,40,0.15)',
              borderRadius: 10,
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.1rem', opacity: 0.4, padding: '0.2rem',
              }}
              aria-label="Effacer la recherche"
            >×</button>
          )}
        </div>

        {/* Filtres par type */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {/* Filtre éphémères — affiché seulement s'il y en a */}
          {hasFeatured && (
            <button
              onClick={handleEphemereClick}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: ephemereOnly ? '#DC7F00' : 'rgba(16,24,40,0.15)',
                background: ephemereOnly ? '#DC7F00' : '#fff',
                color: ephemereOnly ? '#fff' : '#1a1a2e',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              ⏳ Éphémères
              <span style={{ marginLeft: '0.4rem', opacity: 0.65, fontWeight: 400, fontSize: '0.8rem' }}>
                {products.filter(p => p.is_featured).length}
              </span>
            </button>
          )}

          {['tous', ...TYPE_ORDER].map(type => {
            const count = type === 'tous'
              ? products.length
              : products.filter(p => p.supplier?.type === type).length
            if (type !== 'tous' && count === 0) return null
            return (
              <button
                key={type}
                onClick={() => handleTypeClick(type)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: 999,
                  border: '1.5px solid',
                  borderColor: selectedType === type ? '#1a1a2e' : 'rgba(16,24,40,0.15)',
                  background: selectedType === type ? '#1a1a2e' : '#fff',
                  color: selectedType === type ? '#fff' : '#1a1a2e',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {type === 'tous' ? 'Tous' : TYPE_LABELS[type] ?? type}
                <span style={{ marginLeft: '0.4rem', opacity: 0.65, fontWeight: 400, fontSize: '0.8rem' }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filtres par fournisseur (si plusieurs dans le type sélectionné) */}
        {visibleSuppliers.length > 1 && (
          <div style={{
            display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
            marginBottom: '1.5rem', paddingLeft: '0.25rem',
          }}>
            <button
              onClick={() => setSelectedSupplier('tous')}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: 999,
                border: '1px solid',
                borderColor: selectedSupplier === 'tous' ? '#DC7F00' : 'rgba(16,24,40,0.12)',
                background: selectedSupplier === 'tous' ? '#DC7F00' : 'transparent',
                color: selectedSupplier === 'tous' ? '#fff' : '#555',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tous
            </button>
            {visibleSuppliers.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSupplier(s.id)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: selectedSupplier === s.id ? '#DC7F00' : 'rgba(16,24,40,0.12)',
                  background: selectedSupplier === s.id ? '#DC7F00' : 'transparent',
                  color: selectedSupplier === s.id ? '#fff' : '#555',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Bandeau contexte éphémères */}
        {ephemereOnly && (
          <div style={{
            background: '#fff8ed',
            border: '1.5px solid #DC7F00',
            borderRadius: 10,
            padding: '0.65rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            color: '#92400e',
            fontWeight: 600,
          }}>
            <span>⏳</span>
            <span>Produits éphémères — quantités limitées, commandez avant la date limite !</span>
            <button
              onClick={() => setEphemereOnly(false)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                opacity: 0.5,
                padding: '0 0.25rem',
              }}
              aria-label="Retirer le filtre"
            >×</button>
          </div>
        )}

        {/* Résultats */}
        {totalVisible === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
            <p style={{ margin: 0 }}>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div>
            {search && (
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.25rem' }}>
                {totalVisible} produit{totalVisible > 1 ? 's' : ''} trouvé{totalVisible > 1 ? 's' : ''}
              </p>
            )}

            {/* Groupement par type → fournisseur */}
            {TYPE_ORDER.map(type => {
              const groups = byType.get(type)
              if (!groups || groups.length === 0) return null
              const showTypeHeader = selectedType === 'tous'

              return (
                <div key={type} style={{ marginBottom: showTypeHeader ? '2.5rem' : 0 }}>
                  {showTypeHeader && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      marginBottom: '1.25rem',
                    }}>
                      <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                        {TYPE_LABELS[type] ?? type}
                      </h2>
                      <div style={{ flex: 1, height: 2, background: '#f0f0f0', borderRadius: 2 }} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: '1.75rem' }}>
                    {groups.map(({ supplier, items }) => (
                      <section key={supplier.id}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          marginBottom: '0.75rem',
                        }}>
                          <h3 style={{
                            margin: 0, fontSize: '1rem', fontWeight: 700,
                            color: '#1a1a2e',
                          }}>
                            {supplier.name}
                          </h3>
                          <span style={{
                            fontSize: '0.75rem', opacity: 0.5,
                            background: '#f3f4f6', borderRadius: 999,
                            padding: '0.1rem 0.5rem',
                          }}>
                            {items.length} produit{items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {items.map(product => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
