'use client'

import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { scrollPageToTopPersistently } from '@/lib/scroll'
import type { Product } from '@/lib/supabase/products'
import type { CatalogueSupplierSummary } from '@/lib/supabase/catalogue'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { groupProductsByCategory } from '@/lib/catalog/group-by-category'
import { supplierOrderStatusLabel } from '@/lib/catalog/supplier-orders'
import { categoryMatches, productMatches, supplierMatches } from '@/lib/catalog/search'
import { getSupplierDisplayInfo } from '@/lib/catalog/supplier-info'
import { isBiopartnerSupplierName } from '@/lib/import/biopartner-catalogs'
import { useCategoryGridBackNav, useCompactCategoryNav } from '@/lib/catalog/category-nav'
import SupplierCard from './catalogue/SupplierCard'
import CatalogueSupplierSidebar from './catalogue/CatalogueSupplierSidebar'
import CategoryCard from './catalogue/CategoryCard'
import HorizontalScrollStrip from './catalogue/HorizontalScrollStrip'
import ProductList from './catalogue/ProductList'
import CartBar from './CartBar'
import { useCart } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteurs locaux',
  grossiste_bio: 'Grossistes bio',
  autre: 'Autre',
}

const TYPE_ORDER = ['local', 'grossiste_bio', 'autre']
const SEARCH_DEBOUNCE_MS = 300

type Props = {
  summaries: CatalogueSupplierSummary[]
  initialEphemere?: boolean
  /** Compléter une commande livrée (Mon compte → catalogue). */
  extendOrderId?: string | null
  extendSupplierId?: string | null
}

function cacheKey(supplierId: string, featuredOnly: boolean, category?: string | null) {
  if (category) return `${supplierId}:cat:${category}`
  return featuredOnly ? `${supplierId}:featured` : supplierId
}

export default function CatalogueClient({
  summaries,
  initialEphemere = false,
  extendOrderId = null,
  extendSupplierId = null,
}: Props) {
  const { totalItems } = useCart()
  const applyCielMarkup = useApplyCielMarkup()
  const stickyTop = totalItems > 0 ? 'var(--cart-bar-height)' : '0'

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [ephemereOnly, setEphemereOnly] = useState(initialEphemere)
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [catalogNow, setCatalogNow] = useState(() => Date.now())

  const [productCache, setProductCache] = useState<Map<string, Product[]>>(new Map())
  const loadedKeys = useRef(new Set<string>())
  const [loadingSupplier, setLoadingSupplier] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [globalSearchResults, setGlobalSearchResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

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

  const baseSummaries = useMemo(() => {
    if (!ephemereOnly) return summaries
    return summaries.filter(s => s.hasFeatured)
  }, [summaries, ephemereOnly])

  const activeSummary = useMemo(
    () => baseSummaries.find(s => s.supplier.id === activeSupplierId) ?? null,
    [baseSummaries, activeSupplierId],
  )

  const isLargeCatalog = activeSummary
    ? isBiopartnerSupplierName(activeSummary.supplier.name)
    : false

  const activeProducts = useMemo(() => {
    if (!activeSupplierId) return null
    if (isLargeCatalog && !ephemereOnly) return null
    return productCache.get(cacheKey(activeSupplierId, ephemereOnly)) ?? null
  }, [activeSupplierId, ephemereOnly, productCache, isLargeCatalog])

  const categoryProducts = useMemo(() => {
    if (!activeSupplierId || !activeCategory || !isLargeCatalog) return null
    return productCache.get(cacheKey(activeSupplierId, false, activeCategory)) ?? null
  }, [activeSupplierId, activeCategory, isLargeCatalog, productCache])

  const activeCategories = useMemo(() => {
    if (isLargeCatalog && activeSummary) {
      return activeSummary.categories.map(c => ({ name: c.name, items: [] as Product[] }))
    }
    if (activeProducts) return groupProductsByCategory(activeProducts)
    if (!activeSummary) return []
    return activeSummary.categories.map(c => ({ name: c.name, items: [] as Product[] }))
  }, [activeProducts, activeSummary, isLargeCatalog])

  const openSuppliersCount = useMemo(
    () => baseSummaries.filter(s => s.hasOpenOrders).length,
    [baseSummaries],
  )

  const showSupplierSidebar = activeSupplierId != null && openSuppliersCount >= 2

  const categoryCount = activeCategories.length
  const compactCategoryNav = useCompactCategoryNav(categoryCount)
  const categoryGridBackNav = useCategoryGridBackNav(categoryCount)

  const view: 'suppliers' | 'categories' | 'products' =
    activeSummary && activeCategory ? 'products'
    : activeSummary ? 'categories'
    : 'suppliers'

  useEffect(() => {
    scrollPageToTopPersistently()
  }, [view, activeSupplierId, activeCategory])

  const isSearching = search.trim().length > 0

  useEffect(() => {
    if (!activeSupplierId) return
    if (isLargeCatalog && !ephemereOnly) return

    const key = cacheKey(activeSupplierId, ephemereOnly)
    if (loadedKeys.current.has(key)) return

    let cancelled = false
    loadedKeys.current.add(key)

    ;(async () => {
      setLoadingSupplier(true)
      setLoadError(null)
      try {
        const params = new URLSearchParams({ supplierId: activeSupplierId })
        if (ephemereOnly) params.set('featured', '1')
        const res = await fetch(`/api/catalogue/products?${params}`)
        if (!res.ok) throw new Error('Chargement impossible')
        const data = (await res.json()) as Product[]
        if (!cancelled) {
          setProductCache(prev => new Map(prev).set(key, data))
        }
      } catch {
        loadedKeys.current.delete(key)
        if (!cancelled) setLoadError('Impossible de charger les produits. Réessayez.')
      } finally {
        if (!cancelled) setLoadingSupplier(false)
      }
    })()

    return () => { cancelled = true }
  }, [activeSupplierId, ephemereOnly, isLargeCatalog])

  useEffect(() => {
    if (!activeSupplierId || !activeCategory || !isLargeCatalog) return

    const key = cacheKey(activeSupplierId, false, activeCategory)
    if (loadedKeys.current.has(key)) return

    let cancelled = false
    loadedKeys.current.add(key)

    ;(async () => {
      setLoadingSupplier(true)
      setLoadError(null)
      try {
        const params = new URLSearchParams({
          supplierId: activeSupplierId,
          category: activeCategory,
        })
        const res = await fetch(`/api/catalogue/products?${params}`)
        if (!res.ok) throw new Error('Chargement impossible')
        const data = (await res.json()) as Product[]
        if (!cancelled) {
          setProductCache(prev => new Map(prev).set(key, data))
        }
      } catch {
        loadedKeys.current.delete(key)
        if (!cancelled) setLoadError('Impossible de charger les produits. Réessayez.')
      } finally {
        if (!cancelled) setLoadingSupplier(false)
      }
    })()

    return () => { cancelled = true }
  }, [activeSupplierId, activeCategory, isLargeCatalog])

  useEffect(() => {
    if (view !== 'suppliers' || !isSearching) {
      setGlobalSearchResults([])
      setSearchLoading(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      try {
        const params = new URLSearchParams({ q: search.trim() })
        if (selectedType) params.set('type', selectedType)
        const res = await fetch(`/api/catalogue/search?${params}`)
        if (res.ok) {
          setGlobalSearchResults((await res.json()) as Product[])
        } else {
          setGlobalSearchResults([])
        }
      } catch {
        setGlobalSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [search, selectedType, view, isSearching])

  const matchingSupplierIds = useMemo(
    () => new Set(globalSearchResults.map(p => p.supplier?.id).filter(Boolean) as string[]),
    [globalSearchResults],
  )

  const filteredSummaries = useMemo(() => {
    return baseSummaries.filter(s => {
      if (selectedType && s.supplier.type !== selectedType) return false
      if (!isSearching) return true
      return supplierMatches(s.supplier.name, search)
        || matchingSupplierIds.has(s.supplier.id)
    })
  }, [baseSummaries, selectedType, search, isSearching, matchingSupplierIds])

  const supplierProductResults = useMemo(() => {
    if (view !== 'categories' || !activeSummary || !isSearching) return []
    if (activeProducts) {
      return activeProducts.filter(p => productMatches(p, search))
    }
    return []
  }, [view, activeSummary, activeProducts, search, isSearching])

  const [supplierSearchResults, setSupplierSearchResults] = useState<Product[]>([])

  useEffect(() => {
    if (view !== 'categories' || !activeSupplierId || !isSearching || activeProducts) {
      setSupplierSearchResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: search.trim(), supplierId: activeSupplierId })
        const res = await fetch(`/api/catalogue/search?${params}`)
        if (res.ok) setSupplierSearchResults((await res.json()) as Product[])
      } catch {
        setSupplierSearchResults([])
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [view, activeSupplierId, isSearching, search, activeProducts])

  const inlineSupplierResults = activeProducts ? supplierProductResults : supplierSearchResults

  const filteredCategories = useMemo(() => {
    if (!activeSummary) return []
    if (!isSearching) return activeCategories
    return activeCategories.filter(c => categoryMatches(c.name, search))
  }, [activeSummary, activeCategories, search, isSearching])

  const displayedProducts = useMemo(() => {
    if (!activeCategory) return []

    if (isLargeCatalog) {
      const items = categoryProducts ?? []
      if (!isSearching) return items
      return items.filter(p => productMatches(p, search))
    }

    const cat = activeCategories.find(c => c.name === activeCategory)
    if (!cat || !activeProducts) return []
    if (!isSearching) return cat.items
    return cat.items.filter(p => productMatches(p, search))
  }, [activeCategory, activeCategories, activeProducts, categoryProducts, isLargeCatalog, search, isSearching])

  const hasFeatured = summaries.some(s => s.hasFeatured)

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
    const summary = baseSummaries.find(s => s.supplier.id === id) ?? null
    const large = summary ? isBiopartnerSupplierName(summary.supplier.name) : false
    setActiveSupplierId(id)
    setSearch('')
    setLoadError(null)
    if (summary && !large && summary.categories.length === 1) {
      setActiveCategory(summary.categories[0].name)
    } else {
      setActiveCategory(null)
    }
  }

  function openCategory(name: string) {
    setActiveCategory(name)
    setSearch('')
  }

  useEffect(() => {
    if (!extendOrderId || !extendSupplierId) return
    openSupplier(extendSupplierId)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ouverture initiale complément commande
  }, [extendOrderId, extendSupplierId])

  function goBack() {
    if (activeCategory) {
      setActiveCategory(null)
      setSearch('')
    } else if (activeSupplierId) {
      setActiveSupplierId(null)
      setSearch('')
    }
  }

  function supplierStatus(summary: CatalogueSupplierSummary) {
    return supplierOrderStatusLabel(summary.supplier, catalogNow)
  }

  const summariesByType = useMemo(() => {
    const map = new Map<string, CatalogueSupplierSummary[]>()
    for (const s of filteredSummaries) {
      const t = s.supplier.type
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(s)
    }
    return map
  }, [filteredSummaries])

  return (
    <div className="catalogue-page-root" style={{ marginTop: 'calc(-1 * 1rem)', maxWidth: '100%', overflowX: 'clip' }}>
      <CartBar />
      {applyCielMarkup && (
        <div style={{
          background: '#eef2ff',
          borderBottom: '1px solid #c7d2fe',
          color: '#4338ca',
          padding: '0.55rem 1.25rem',
          fontSize: '0.88rem',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          Membre Ciel — les prix affichés incluent une majoration de +20&nbsp;%.
        </div>
      )}
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '5rem' }}>

        <div className={showSupplierSidebar ? 'catalogue-layout catalogue-layout--with-sidebar' : 'catalogue-layout'}>
        {showSupplierSidebar && (
          <CatalogueSupplierSidebar
            summaries={baseSummaries}
            activeSupplierId={activeSupplierId}
            catalogNow={catalogNow}
            onSelect={openSupplier}
          />
        )}

        <div className="catalogue-layout__main">

        <nav
          aria-label="Fil d'ariane"
          className={view === 'products' ? 'catalogue-breadcrumb catalogue-breadcrumb--mobile-hidden' : 'catalogue-breadcrumb'}
          style={{
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
          {activeSummary && (
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
                {activeSummary.supplier.name}
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

        <div className={`catalogue-page-head${view === 'products' ? ' catalogue-page-head--compact' : ''}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {view !== 'suppliers' && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              style={{
                flexShrink: 0, marginTop: '0.15rem', width: 40, height: 40,
                border: '1.5px solid rgba(16,24,40,0.12)', borderRadius: 10,
                background: '#fff', cursor: 'pointer', fontSize: '1.2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ←
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ marginBottom: '0.25rem' }}>
              {view === 'suppliers' && 'Catalogue de commande'}
              {view === 'categories' && activeSummary?.supplier.name}
              {view === 'products' && activeCategory}
            </h1>
            <p className="catalogue-page-sub" style={{ margin: 0, opacity: 0.7 }}>
              {view === 'suppliers' && 'Choisissez un fournisseur, puis une catégorie pour parcourir les produits.'}
              {view === 'categories' && (
                categoryGridBackNav
                  ? 'Choisissez une catégorie ci-dessous ou utilisez la recherche.'
                  : 'Choisissez une catégorie pour afficher les produits.'
              )}
              {view === 'products' && activeProducts && !isSearching && (
                `${displayedProducts.length} produit${displayedProducts.length !== 1 ? 's' : ''} dans ${activeSummary?.supplier.name}`
              )}
            </p>
          </div>
        </div>

        {extendOrderId && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.65rem 1rem',
            background: '#e3f2fd',
            border: '1.5px solid #90caf9',
            borderRadius: 10,
            fontSize: '0.88rem',
            color: '#1565c0',
            lineHeight: 1.45,
          }}>
            <strong>Compléter une commande livrée</strong> — choisissez un produit du même fournisseur, puis cliquez{' '}
            <strong>Ajouter à ma commande</strong>. Le total sera mis à jour à la clôture.
          </div>
        )}

        <div className="catalogue-search" style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', opacity: 0.4, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              paddingRight: search ? '2.5rem' : '1rem',
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
          <HorizontalScrollStrip className="catalogue-type-filters-wrap" ariaLabel="Types de fournisseurs">
            <div className="catalogue-type-filters">
              {hasFeatured && (
                <button type="button" onClick={handleEphemereClick} style={{
                  padding: '0.4rem 1rem', borderRadius: 999, border: '1.5px solid',
                  borderColor: ephemereOnly ? '#DC7F00' : 'rgba(16,24,40,0.15)',
                  background: ephemereOnly ? '#DC7F00' : '#fff',
                  color: ephemereOnly ? '#fff' : '#1a1a2e',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}>
                  ⏳ Éphémères
                </button>
              )}
              {!ephemereOnly && TYPE_ORDER.map(type => {
                const count = baseSummaries.filter(s => s.supplier.type === type).length
                if (count === 0) return null
                const active = selectedType === type
                return (
                  <button key={type} type="button" onClick={() => handleTypeClick(type)} style={{
                    padding: '0.4rem 1rem', borderRadius: 999, border: '1.5px solid',
                    borderColor: active ? '#1a1a2e' : 'rgba(16,24,40,0.15)',
                    background: active ? '#1a1a2e' : '#fff',
                    color: active ? '#fff' : '#1a1a2e',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  }}>
                    {TYPE_LABELS[type] ?? type}
                    <span style={{ marginLeft: '0.4rem', opacity: 0.65, fontWeight: 400, fontSize: '0.8rem' }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </HorizontalScrollStrip>
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

        {view === 'products' && compactCategoryNav && (
          <div
            className="catalogue-sticky-categories-shell"
            style={{ top: stickyTop }}
          >
            <HorizontalScrollStrip
              className="catalogue-sticky-categories-wrap"
              ariaLabel="Catégories du fournisseur"
            >
              <div className="catalogue-sticky-categories">
                {activeCategories.map(({ name }) => {
                  const count =
                    activeSummary?.categories.find(c => c.name === name)?.count ?? 0
                  const active = activeCategory === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => openCategory(name)}
                      aria-current={active ? 'true' : undefined}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: active ? '#DC7F00' : 'rgba(16,24,40,0.12)',
                        background: active ? '#DC7F00' : '#fff',
                        color: active ? '#fff' : '#555',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                      {count > 0 ? ` (${count})` : ''}
                    </button>
                  )
                })}
              </div>
            </HorizontalScrollStrip>
          </div>
        )}

        {view === 'products' && categoryGridBackNav && !isSearching && (
          <button
            type="button"
            onClick={() => { setActiveCategory(null); setSearch('') }}
            className="catalogue-change-category-btn"
          >
            ← Changer de catégorie
          </button>
        )}

        {loadError && (
          <p role="alert" style={{
            color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem',
            borderRadius: 8, marginBottom: '1rem',
          }}>
            {loadError}
          </p>
        )}

        {loadingSupplier && view !== 'suppliers' && (
          <LoadingState label="Chargement des produits…" />
        )}

        {/* Vue fournisseurs */}
        {view === 'suppliers' && (
          <>
            {isSearching && searchLoading && (
              <LoadingState label="Recherche en cours…" />
            )}

            {isSearching && !searchLoading && globalSearchResults.length > 0 && (
              <SearchResultsSection
                title={`Produits trouvés (${globalSearchResults.length}${globalSearchResults.length >= 100 ? '+' : ''})`}
                subtitle="Ajoutez directement au panier ou ouvrez le fournisseur pour voir la catégorie."
              >
                <ProductList products={globalSearchResults} nowMs={catalogNow} />
              </SearchResultsSection>
            )}

            {isSearching && !searchLoading && globalSearchResults.length > 0 && filteredSummaries.length > 0 && (
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                Fournisseurs
              </h2>
            )}

            {!isSearching && filteredSummaries.length === 0 ? (
              <EmptyState message="Aucun fournisseur disponible." />
            ) : isSearching && !searchLoading && filteredSummaries.length === 0 && globalSearchResults.length === 0 ? (
              <EmptyState message="Aucun produit ni fournisseur ne correspond à votre recherche." />
            ) : filteredSummaries.length > 0 ? (
              TYPE_ORDER.map(type => {
                const list = summariesByType.get(type)
                if (!list?.length) return null
                const showHeader = !selectedType && !ephemereOnly && !isSearching
                return (
                  <section key={type} style={{ marginBottom: showHeader ? '2rem' : 0 }}>
                    {showHeader && (
                      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                        {TYPE_LABELS[type] ?? type}
                      </h2>
                    )}
                    <div className="catalogue-supplier-grid">
                      {list.map(summary => {
                        const status = supplierStatus(summary)
                        const display = getSupplierDisplayInfo(summary.supplier.name, summary.supplier.type)
                        return (
                          <SupplierCard
                            key={summary.supplier.id}
                            name={summary.supplier.name}
                            typeLabel={TYPE_LABELS[summary.supplier.type] ?? summary.supplier.type}
                            description={display.description}
                            emoji={display.emoji}
                            logo={display.logo}
                            productCount={summary.productCount}
                            categoryCount={summary.categories.length}
                            isOpen={status.isOpen}
                            statusLabel={status.label}
                            onClick={() => openSupplier(summary.supplier.id)}
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
        {view === 'categories' && activeSummary && !loadingSupplier && (
          <>
            {isSearching && inlineSupplierResults.length > 0 && (
              <SearchResultsSection
                title={`Produits trouvés (${inlineSupplierResults.length})`}
                subtitle={`Dans ${activeSummary.supplier.name} — ajoutez au panier ou choisissez une catégorie ci-dessous.`}
              >
                <ProductList products={inlineSupplierResults} nowMs={catalogNow} />
              </SearchResultsSection>
            )}

            {!isSearching ? (
              <>
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>
                  {filteredCategories.length} catégorie{filteredCategories.length > 1 ? 's' : ''} — cliquez pour voir les produits
                </p>
                <div className="catalogue-category-grid">
                  {filteredCategories.map(({ name }) => {
                    const meta = activeSummary.categories.find(c => c.name === name)
                    const count = meta?.count ?? 0
                    const orderable = activeProducts && activeSummary
                      ? activeProducts.filter(p =>
                          (p.category?.trim() || 'Autres') === name &&
                          productOrderableAt(p, catalogNow),
                        ).length
                      : (activeSummary && supplierOrderStatusLabel(activeSummary.supplier, catalogNow).isOpen ? count : 0)
                    return (
                      <CategoryCard
                        key={name}
                        name={name}
                        productCount={count}
                        orderableCount={orderable}
                        onClick={() => openCategory(name)}
                      />
                    )
                  })}
                </div>
              </>
            ) : filteredCategories.length === 0 && inlineSupplierResults.length === 0 ? (
              <EmptyState message="Aucune catégorie ni produit ne correspond à votre recherche." />
            ) : filteredCategories.length > 0 ? (
              <>
                {inlineSupplierResults.length === 0 && (
                  <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.6 }}>
                    Produits trouvés (0)
                  </p>
                )}
                {inlineSupplierResults.length > 0 && (
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, opacity: 0.65 }}>
                    Catégories
                  </h2>
                )}
                <div className="catalogue-category-grid">
                  {filteredCategories.map(({ name }) => {
                    const meta = activeSummary.categories.find(c => c.name === name)
                    const count = meta?.count ?? 0
                    const open = supplierOrderStatusLabel(activeSummary.supplier, catalogNow).isOpen
                    return (
                      <CategoryCard
                        key={name}
                        name={name}
                        productCount={count}
                        orderableCount={open ? count : 0}
                        onClick={() => openCategory(name)}
                      />
                    )
                  })}
                </div>
              </>
            ) : null}
          </>
        )}

        {/* Vue produits */}
        {view === 'products' && !loadingSupplier && (activeProducts || categoryProducts || isLargeCatalog) && (
          displayedProducts.length === 0 && isLargeCatalog && !categoryProducts ? (
            <LoadingState label="Chargement de la catégorie…" />
          ) : displayedProducts.length === 0 ? (
            <>
              {isSearching && (
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.6 }}>
                  Produits trouvés (0)
                </p>
              )}
              <EmptyState message="Aucun produit ne correspond à votre recherche." />
            </>
          ) : isSearching ? (
            <SearchResultsSection
              title={`Produits trouvés (${displayedProducts.length})`}
              subtitle={`Dans ${activeCategory} — ${activeSummary?.supplier.name ?? ''}`}
            >
              <ProductList
              products={displayedProducts}
              nowMs={catalogNow}
              extendOrderId={extendOrderId}
            />
            </SearchResultsSection>
          ) : (
            <ProductList
              products={displayedProducts}
              nowMs={catalogNow}
              extendOrderId={extendOrderId}
            />
          )
        )}

        </div>
        </div>
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

function LoadingState({ label }: { label: string }) {
  return (
    <p style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.55, margin: 0 }}>
      {label}
    </p>
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
