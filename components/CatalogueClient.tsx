'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Product } from '@/lib/supabase/products'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { groupProductsByCategory } from '@/lib/catalog/group-by-category'
import { formatOrderWindow, nextOrderWindowForSupplier } from '@/lib/catalog/order-windows'
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
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [ephemereOnly, setEphemereOnly] = useState(initialEphemere)
  const [catalogNow, setCatalogNow] = useState(() => Date.now())

  useEffect(() => {
    const bump = () => setCatalogNow(Date.now())
    bump()
    const id = window.setInterval(bump, 30_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const visibleProducts = products
  const isSearching = search.trim().length > 0

  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }>()
    visibleProducts.forEach(p => {
      if (p.supplier && !map.has(p.supplier.id)) {
        map.set(p.supplier.id, { id: p.supplier.id, name: p.supplier.name, type: p.supplier.type })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [visibleProducts])

  const visibleSuppliers = useMemo(() => {
    if (!selectedType) return suppliers
    return suppliers.filter(s => s.type === selectedType)
  }, [suppliers, selectedType])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return visibleProducts.filter(p => {
      if (q) {
        const haystack = [
          p.name,
          p.description,
          p.category,
          p.supplier?.name,
        ].join(' ').toLowerCase()
        return haystack.includes(q)
      }
      if (ephemereOnly && !p.is_featured) return false
      if (!ephemereOnly && selectedType && p.supplier?.type !== selectedType) return false
      if (!ephemereOnly && selectedSupplier && p.supplier?.id !== selectedSupplier) return false
      return true
    })
  }, [visibleProducts, search, selectedType, selectedSupplier, ephemereOnly])

  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: NonNullable<Product['supplier']>; items: Product[] }>()
    filtered.forEach(p => {
      if (!p.supplier) return
      if (!map.has(p.supplier.id)) {
        map.set(p.supplier.id, { supplier: p.supplier, items: [] })
      }
      map.get(p.supplier.id)!.items.push(p)
    })
    return Array.from(map.values())
      .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name))
      .map(group => ({
        ...group,
        categories: groupProductsByCategory(group.items),
      }))
  }, [filtered])

  const byType = useMemo(() => {
    const map = new Map<string, typeof bySupplier>()
    bySupplier.forEach(group => {
      const type = group.supplier.type
      if (!map.has(type)) map.set(type, [])
      map.get(type)!.push(group)
    })
    return map
  }, [bySupplier])

  const hasFeatured = visibleProducts.some(p => p.is_featured)

  function handleTypeClick(type: string) {
    setSelectedType(prev => (prev === type ? null : type))
    setSelectedSupplier(null)
    setEphemereOnly(false)
  }

  function handleSupplierClick(id: string) {
    setSelectedSupplier(prev => (prev === id ? null : id))
  }

  function handleEphemereClick() {
    setEphemereOnly(v => !v)
    setSelectedType(null)
    setSelectedSupplier(null)
  }

  const totalVisible = filtered.length
  const showTypeHeaders = !isSearching && selectedType === null && !ephemereOnly

  return (
    <div style={{ marginTop: 'calc(-1 * 1rem)' }}>
      <CartBar />
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '5rem' }}>

        <nav aria-label="Fil d'ariane" style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.8rem', color: 'rgba(16,24,40,0.4)', marginBottom: '1.25rem',
        }}>
          <span>Accueil</span>
          <span aria-hidden>›</span>
          <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Catalogue</span>
        </nav>

        <h1 style={{ marginBottom: '0.25rem' }}>Catalogue de commande</h1>
        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
          Sélectionnez vos produits et ajoutez-les au panier. Une commande sera créée par fournisseur.
        </p>

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

        {!isSearching && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
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
                    {visibleProducts.filter(p => p.is_featured).length}
                  </span>
                </button>
              )}

              {!ephemereOnly && TYPE_ORDER.map(type => {
                const count = visibleProducts.filter(p => p.supplier?.type === type).length
                if (count === 0) return null
                const active = selectedType === type
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeClick(type)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: 999,
                      border: '1.5px solid',
                      borderColor: active ? '#1a1a2e' : 'rgba(16,24,40,0.15)',
                      background: active ? '#1a1a2e' : '#fff',
                      color: active ? '#fff' : '#1a1a2e',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {TYPE_LABELS[type] ?? type}
                    <span style={{ marginLeft: '0.4rem', opacity: 0.65, fontWeight: 400, fontSize: '0.8rem' }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {!ephemereOnly && visibleSuppliers.length > 1 && (
              <div style={{
                display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
                marginBottom: '1.5rem', paddingLeft: '0.25rem',
              }}>
                {visibleSuppliers.map(s => {
                  const active = selectedSupplier === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSupplierClick(s.id)}
                      style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: active ? '#DC7F00' : 'rgba(16,24,40,0.12)',
                        background: active ? '#DC7F00' : 'transparent',
                        color: active ? '#fff' : '#555',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {isSearching && (
          <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
            Recherche dans tout le catalogue
          </p>
        )}

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

        {totalVisible === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
            <p style={{ margin: 0 }}>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div>
            {isSearching && (
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.25rem' }}>
                {totalVisible} produit{totalVisible > 1 ? 's' : ''} trouvé{totalVisible > 1 ? 's' : ''}
              </p>
            )}

            {TYPE_ORDER.map(type => {
              const groups = byType.get(type)
              if (!groups || groups.length === 0) return null

              return (
                <div key={type} style={{ marginBottom: showTypeHeaders ? '2.5rem' : 0 }}>
                  {showTypeHeaders && (
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
                    {groups.map(({ supplier, categories }) => {
                      const allItems = categories.flatMap(c => c.items)
                      const supplierOpen = allItems.some(p => productOrderableAt(p, catalogNow))
                      const nextWindow = formatOrderWindow(
                        nextOrderWindowForSupplier(supplier, catalogNow),
                      )

                      return (
                        <section key={supplier.id}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            marginBottom: '0.75rem', flexWrap: 'wrap',
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
                              {allItems.length} produit{allItems.length > 1 ? 's' : ''}
                            </span>
                            <span style={{
                              fontSize: '0.78rem', fontWeight: 500,
                              background: supplierOpen ? '#ecfdf5' : '#f3f4f6',
                              color: supplierOpen ? '#047857' : '#4b5563',
                              borderRadius: 999, padding: '0.15rem 0.6rem',
                            }}>
                              {supplierOpen
                                ? 'Commandes ouvertes'
                                : `Prochaine commande : ${nextWindow}`}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gap: '1.25rem' }}>
                            {categories.map(({ name, items }) => (
                              <div key={name}>
                                <h4 style={{
                                  margin: '0 0 0.5rem',
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  color: 'rgba(16,24,40,0.55)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}>
                                  {name}
                                </h4>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                  {items.map(product => (
                                    <ProductCard key={product.id} product={product} nowMs={catalogNow} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )
                    })}
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
