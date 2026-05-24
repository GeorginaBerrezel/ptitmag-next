'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import type { Product, Supplier } from '@/lib/supabase/products'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { groupProductsByCategory } from '@/lib/catalog/group-by-category'
import { formatOrderWindow, nextOrderWindowForSupplier } from '@/lib/catalog/order-windows'
import {
  categoryMatches,
  productMatches,
  supplierMatches,
} from '@/lib/catalog/search'
import SupplierCard from './catalogue/SupplierCard'
import CategoryCard from './catalogue/CategoryCard'
import ProductCard from './ProductCard'
import CartBar from './CartBar'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteurs locaux',
  grossiste_bio: 'Grossistes bio',
  autre: 'Autre',
}

const TYPE_ORDER = ['local', 'grossiste_bio', 'autre']

type SupplierGroup = {
  supplier: Supplier
  products: Product[]
  categories: ReturnType<typeof groupProductsByCategory>
}

type Props = {
  products: Product[]
  initialEphemere?: boolean
}

function buildSupplierGroups(items: Product[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>()
  for (const p of items) {
    if (!p.supplier) continue
    if (!map.has(p.supplier.id)) {
      map.set(p.supplier.id, { supplier: p.supplier, products: [], categories: [] })
    }
    map.get(p.supplier.id)!.products.push(p)
  }
  return Array.from(map.values())
    .map(g => ({
      ...g,
      categories: groupProductsByCategory(g.products),
    }))
    .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name))
}

export default function CatalogueClient({ products, initialEphemere = false }: Props) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [ephemereOnly, setEphemereOnly] = useState(initialEphemere)
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
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

  const baseProducts = useMemo(() => {
    if (!ephemereOnly) return products
    return products.filter(p => p.is_featured)
  }, [products, ephemereOnly])

  const allGroups = useMemo(() => buildSupplierGroups(baseProducts), [baseProducts])

  const activeGroup = useMemo(
    () => allGroups.find(g => g.supplier.id === activeSupplierId) ?? null,
    [allGroups, activeSupplierId],
  )

  const view: 'suppliers' | 'categories' | 'products' =
    activeGroup && activeCategory ? 'products'
    : activeGroup ? 'categories'
    : 'suppliers'

  const isSearching = search.trim().length > 0

  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      if (selectedType && g.supplier.type !== selectedType) return false
      if (!isSearching) return true
      return supplierMatches(g.supplier.name, search)
        || g.products.some(p => productMatches(p, search))
    })
  }, [allGroups, selectedType, search, isSearching])

  /** Résultats produits à l'accueil catalogue (recherche globale). */
  const globalProductResults = useMemo(() => {
    if (view !== 'suppliers' || !isSearching) return []
    return baseProducts.filter(p => {
      if (selectedType && p.supplier?.type !== selectedType) return false
      return productMatches(p, search)
    })
  }, [baseProducts, selectedType, search, isSearching, view])

  /** Produits trouvés dans un fournisseur (vue catégories + recherche). */
  const supplierProductResults = useMemo(() => {
    if (view !== 'categories' || !activeGroup || !isSearching) return []
    return activeGroup.products.filter(p => productMatches(p, search))
  }, [view, activeGroup, search, isSearching])

  const filteredCategories = useMemo(() => {
    if (!activeGroup) return []
    if (!isSearching) return activeGroup.categories
    return activeGroup.categories.filter(c => categoryMatches(c.name, search))
  }, [activeGroup, search, isSearching])

  const displayedProducts = useMemo(() => {
    if (!activeGroup || !activeCategory) return []
    const cat = activeGroup.categories.find(c => c.name === activeCategory)
    if (!cat) return []
    if (!isSearching) return cat.items
    return cat.items.filter(p => productMatches(p, search))
  }, [activeGroup, activeCategory, search, isSearching])

  const hasFeatured = products.some(p => p.is_featured)

  const searchPlaceholder =
    view === 'suppliers'
      ? 'Rechercher un produit ou un fournisseur…'
    : view === 'categories'
      ? 'Rechercher une catégorie ou un produit…'
    : 'Rechercher un produit…'

  function handleTypeClick(type: string) {
    setSelectedType(prev => (prev === type ? null : type))
    setActiveSupplierId(null)
    setActiveCategory(null)
    setSearch('')
    setEphemereOnly(false)
  }

  function handleEphemereClick() {
    setEphemereOnly(v => !v)
    setSelectedType(null)
    setActiveSupplierId(null)
    setActiveCategory(null)
    setSearch('')
  }

  function openSupplier(id: string) {
    setActiveSupplierId(id)
    setActiveCategory(null)
    setSearch('')
  }

  function openCategory(name: string) {
    setActiveCategory(name)
    setSearch('')
  }

  function goBack() {
    if (activeCategory) {
      setActiveCategory(null)
      setSearch('')
    } else if (activeSupplierId) {
      setActiveSupplierId(null)
      setSearch('')
    }
  }

  function supplierStatus(group: SupplierGroup) {
    const open = group.products.some(p => productOrderableAt(p, catalogNow))
    if (open) return { isOpen: true, label: 'Commandes ouvertes' }
    const next = formatOrderWindow(nextOrderWindowForSupplier(group.supplier, catalogNow))
    return { isOpen: false, label: `Prochaine commande : ${next}` }
  }

  const groupsByType = useMemo(() => {
    const map = new Map<string, SupplierGroup[]>()
    for (const g of filteredGroups) {
      const t = g.supplier.type
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(g)
    }
    return map
  }, [filteredGroups])

  return (
    <div style={{ marginTop: 'calc(-1 * 1rem)' }}>
      <CartBar />
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '5rem' }}>

        <nav aria-label="Fil d'ariane" style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
          fontSize: '0.8rem', color: 'rgba(16,24,40,0.4)', marginBottom: '1.25rem',
        }}>
          <button
            type="button"
            onClick={() => { setActiveSupplierId(null); setActiveCategory(null); setSearch('') }}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: activeSupplierId ? '#DC7F00' : 'rgba(16,24,40,0.75)',
              fontWeight: activeSupplierId ? 500 : 600,
              fontSize: 'inherit',
            }}
          >
            Catalogue
          </button>
          {activeGroup && (
            <>
              <span aria-hidden>›</span>
              <button
                type="button"
                onClick={() => { setActiveCategory(null); setSearch('') }}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: activeCategory ? '#DC7F00' : 'rgba(16,24,40,0.75)',
                  fontWeight: activeCategory ? 500 : 600,
                  fontSize: 'inherit',
                }}
              >
                {activeGroup.supplier.name}
              </button>
            </>
          )}
          {activeCategory && (
            <>
              <span aria-hidden>›</span>
              <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>{activeCategory}</span>
            </>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {view !== 'suppliers' && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              style={{
                flexShrink: 0,
                marginTop: '0.15rem',
                width: 40, height: 40,
                border: '1.5px solid rgba(16,24,40,0.12)',
                borderRadius: 10,
                background: '#fff',
                cursor: 'pointer',
                fontSize: '1.2rem',
                lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ←
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ marginBottom: '0.25rem' }}>
              {view === 'suppliers' && 'Catalogue de commande'}
              {view === 'categories' && activeGroup?.supplier.name}
              {view === 'products' && activeCategory}
            </h1>
            <p style={{ margin: 0, opacity: 0.7 }}>
              {view === 'suppliers' && 'Choisissez un fournisseur, puis une catégorie pour parcourir les produits.'}
              {view === 'categories' && 'Choisissez une catégorie pour afficher les produits.'}
              {view === 'products' && `${displayedProducts.length} produit${displayedProducts.length !== 1 ? 's' : ''} dans ${activeGroup?.supplier.name}`}
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', opacity: 0.4, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="search"
            placeholder={searchPlaceholder}
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
              type="button"
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

        {view === 'suppliers' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {hasFeatured && (
              <button
                type="button"
                onClick={handleEphemereClick}
                style={{
                  padding: '0.4rem 1rem', borderRadius: 999, border: '1.5px solid',
                  borderColor: ephemereOnly ? '#DC7F00' : 'rgba(16,24,40,0.15)',
                  background: ephemereOnly ? '#DC7F00' : '#fff',
                  color: ephemereOnly ? '#fff' : '#1a1a2e',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                ⏳ Éphémères
              </button>
            )}
            {!ephemereOnly && TYPE_ORDER.map(type => {
              const count = allGroups.filter(g => g.supplier.type === type).length
              if (count === 0) return null
              const active = selectedType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeClick(type)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: 999, border: '1.5px solid',
                    borderColor: active ? '#1a1a2e' : 'rgba(16,24,40,0.15)',
                    background: active ? '#1a1a2e' : '#fff',
                    color: active ? '#fff' : '#1a1a2e',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
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
        )}

        {view === 'products' && activeGroup && (
          <div style={{
            display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
            marginBottom: '1.25rem', padding: '0.5rem 0',
            position: 'sticky', top: '3.5rem', zIndex: 10,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)',
          }}>
            {activeGroup.categories.map(({ name, items }) => (
              <button
                key={name}
                type="button"
                onClick={() => openCategory(name)}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: 999,
                  border: '1px solid',
                  borderColor: activeCategory === name ? '#DC7F00' : 'rgba(16,24,40,0.12)',
                  background: activeCategory === name ? '#DC7F00' : '#fff',
                  color: activeCategory === name ? '#fff' : '#555',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {name} ({items.length})
              </button>
            ))}
          </div>
        )}

        {ephemereOnly && view === 'suppliers' && (
          <div style={{
            background: '#fff8ed', border: '1.5px solid #DC7F00', borderRadius: 10,
            padding: '0.65rem 1rem', marginBottom: '1.25rem',
            fontSize: '0.88rem', color: '#92400e', fontWeight: 600,
          }}>
            ⏳ Produits éphémères — choisissez un fournisseur pour voir les offres limitées.
          </div>
        )}

        {/* Vue fournisseurs */}
        {view === 'suppliers' && (
          <>
            {isSearching && globalProductResults.length > 0 && (
              <SearchResultsSection
                title={`Produits trouvés (${globalProductResults.length})`}
                subtitle="Ajoutez directement au panier ou ouvrez le fournisseur pour voir la catégorie."
              >
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {globalProductResults.map(product => (
                    <ProductCard key={product.id} product={product} nowMs={catalogNow} />
                  ))}
                </div>
              </SearchResultsSection>
            )}

            {isSearching && globalProductResults.length > 0 && filteredGroups.length > 0 && (
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                Fournisseurs
              </h2>
            )}

            {!isSearching && filteredGroups.length === 0 ? (
              <EmptyState message="Aucun fournisseur disponible." />
            ) : isSearching && filteredGroups.length === 0 && globalProductResults.length === 0 ? (
              <EmptyState message="Aucun produit ni fournisseur ne correspond à votre recherche." />
            ) : filteredGroups.length > 0 ? (
              TYPE_ORDER.map(type => {
                const groups = groupsByType.get(type)
                if (!groups?.length) return null
                const showHeader = !selectedType && !ephemereOnly && !isSearching
                return (
                  <section key={type} style={{ marginBottom: showHeader ? '2rem' : 0 }}>
                    {showHeader && (
                      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                        {TYPE_LABELS[type] ?? type}
                      </h2>
                    )}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.85rem',
                    }}>
                      {groups.map(group => {
                        const status = supplierStatus(group)
                        return (
                          <SupplierCard
                            key={group.supplier.id}
                            name={group.supplier.name}
                            typeLabel={TYPE_LABELS[group.supplier.type] ?? group.supplier.type}
                            productCount={group.products.length}
                            categoryCount={group.categories.length}
                            isOpen={status.isOpen}
                            statusLabel={status.label}
                            onClick={() => openSupplier(group.supplier.id)}
                          />
                        )
                      })}
                    </div>
                  </section>
                )
              })
            ) : null}
          </>
        )}

        {/* Vue catégories */}
        {view === 'categories' && activeGroup && (
          <>
            {isSearching && supplierProductResults.length > 0 && (
              <SearchResultsSection
                title={`Produits trouvés (${supplierProductResults.length})`}
                subtitle={`Dans ${activeGroup.supplier.name} — ajoutez au panier ou choisissez une catégorie ci-dessous.`}
              >
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {supplierProductResults.map(product => (
                    <ProductCard key={product.id} product={product} nowMs={catalogNow} />
                  ))}
                </div>
              </SearchResultsSection>
            )}

            {!isSearching ? (
              <>
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>
                  {filteredCategories.length} catégorie{filteredCategories.length > 1 ? 's' : ''} — cliquez pour voir les produits
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.75rem',
                }}>
                  {filteredCategories.map(({ name, items }) => (
                    <CategoryCard
                      key={name}
                      name={name}
                      productCount={items.length}
                      orderableCount={items.filter(p => productOrderableAt(p, catalogNow)).length}
                      onClick={() => openCategory(name)}
                    />
                  ))}
                </div>
              </>
            ) : filteredCategories.length === 0 && supplierProductResults.length === 0 ? (
              <EmptyState message="Aucune catégorie ni produit ne correspond à votre recherche." />
            ) : filteredCategories.length > 0 ? (
              <>
                {supplierProductResults.length > 0 && (
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                    Catégories
                  </h2>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.75rem',
                }}>
                  {filteredCategories.map(({ name, items }) => (
                    <CategoryCard
                      key={name}
                      name={name}
                      productCount={items.length}
                      orderableCount={items.filter(p => productOrderableAt(p, catalogNow)).length}
                      onClick={() => openCategory(name)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}

        {/* Vue produits */}
        {view === 'products' && (
          displayedProducts.length === 0 ? (
            <EmptyState message="Aucun produit ne correspond à votre recherche." />
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} nowMs={catalogNow} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function SearchResultsSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.6 }}>{subtitle}</p>
      {children}
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>
      <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  )
}
