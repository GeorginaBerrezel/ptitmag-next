'use client'

import { useCallback, useEffect, useState } from 'react'

type SearchProduct = {
  id: string
  name: string
  unit: string
  unit_price: number | null
  supplier_ref: string | null
  category: string | null
  supplier: { id: string; name: string } | null
}

type Props = {
  memberId: string
  contextOrderId: string
  memberName: string
  onAdded: () => void
  onClose: () => void
}

export default function AdminAddProductAtClosure({
  memberId,
  contextOrderId,
  memberName,
  onAdded,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setProducts([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/catalogue/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Recherche impossible.')
      setProducts((data.products as SearchProduct[]) ?? [])
    } catch (e) {
      setError((e as Error).message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void search(query), 300)
    return () => window.clearTimeout(t)
  }, [query, search])

  async function handleAdd(product: SearchProduct) {
    if (product.unit_price == null) {
      alert('Ce produit n\'a pas de prix.')
      return
    }
    setAddingId(product.id)
    setError(null)
    try {
      const res = await fetch('/api/admin/orders/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          contextOrderId,
          productId: product.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ajout impossible.')
      onAdded()
      setQuery('')
      setProducts([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="admin-add-product" role="dialog" aria-label={`Ajouter un produit pour ${memberName}`}>
      <div className="admin-add-product__header">
        <strong>+ Ajouter un produit</strong>
        <span className="admin-add-product__hint">
          Catalogue entier · 1 unité · prix catalogue sans majoration
        </span>
        <button type="button" className="admin-add-product__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      <input
        type="search"
        className="admin-add-product__search"
        placeholder="Rechercher un produit (ex. fraise, bière…)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />

      {loading && <p className="admin-add-product__status">Recherche…</p>}
      {error && <p className="admin-add-product__error">{error}</p>}

      {products.length > 0 && (
        <ul className="admin-add-product__list">
          {products.map(p => {
            const price = p.unit_price != null ? `CHF ${Number(p.unit_price).toFixed(2)}` : '—'
            const isAdding = addingId === p.id
            return (
              <li key={p.id} className="admin-add-product__item">
                <div className="admin-add-product__item-main">
                  <span className="admin-add-product__name">{p.name}</span>
                  <span className="admin-add-product__meta">
                    {p.supplier?.name ?? '—'} · {price} / {p.unit}
                    {p.supplier_ref ? ` · réf. ${p.supplier_ref}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-add-product__add-btn"
                  disabled={isAdding || p.unit_price == null}
                  onClick={() => void handleAdd(p)}
                >
                  {isAdding ? 'Ajout…' : '+ 1'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {query.trim() && !loading && products.length === 0 && !error && (
        <p className="admin-add-product__status">Aucun produit trouvé.</p>
      )}
    </div>
  )
}
