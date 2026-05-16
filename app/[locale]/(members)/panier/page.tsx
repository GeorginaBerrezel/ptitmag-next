'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart/CartContext'
import { Link } from '@/i18n/navigation'

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre: 'Autre',
}

export default function PanierPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const { items, updateQuantity, removeItem, clearCart, globalTotal } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Grouper par fournisseur
  const bySupplier = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = []
    acc[item.supplierId].push(item)
    return acc
  }, {})

  const supplierCount = Object.keys(bySupplier).length

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    clearCart()
    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: 600 }}>
        <div style={{
          background: '#e8f5e9',
          borderRadius: 16,
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>✓</p>
          <h1 style={{ margin: '0 0 0.5rem' }}>Commande confirmée !</h1>
          <p style={{ opacity: 0.7, margin: '0 0 1.5rem' }}>
            Vos commandes ont été enregistrées. L&apos;équipe du p&apos;tit mag vous contactera pour confirmer les détails.
          </p>
          <Link
            href="/mon-compte"
            locale={locale}
            style={{
              display: 'inline-block',
              background: '#2e7d32',
              color: '#fff',
              borderRadius: 8,
              padding: '0.6rem 1.5rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Retour à mon compte
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: 600 }}>
        <nav aria-label="Fil d'ariane" style={breadcrumbStyle}>
          <span>Accueil</span>
          <span aria-hidden>›</span>
          <span>Catalogue</span>
          <span aria-hidden>›</span>
          <span style={crumbActiveStyle}>Panier</span>
        </nav>
        <h1 style={{ marginBottom: '0.5rem' }}>Mon panier</h1>
        <p style={{ opacity: 0.6 }}>Votre panier est vide.</p>
        <Link
          href="/commandes"
          locale={locale}
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            background: '#DC7F00',
            color: '#fff',
            borderRadius: 8,
            padding: '0.5rem 1.25rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Voir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 720 }}>
      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={breadcrumbStyle}>
        <span>Accueil</span>
        <span aria-hidden>›</span>
        <span>Catalogue</span>
        <span aria-hidden>›</span>
        <span style={crumbActiveStyle}>Panier</span>
      </nav>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Mon panier</h1>
        <p style={{
          margin: 0,
          fontSize: '1.3rem',
          fontWeight: 700,
          background: '#1a1a2e',
          color: '#fff',
          borderRadius: 10,
          padding: '0.35rem 1rem',
        }}>
          Total global : CHF {globalTotal.toFixed(2)}
        </p>
      </div>
      <p style={{ opacity: 0.6, marginBottom: '2rem' }}>
        {supplierCount} commande{supplierCount > 1 ? 's' : ''} seront créées (une par fournisseur)
      </p>

      {error && (
        <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {error}
        </p>
      )}

      {/* Sections par fournisseur */}
      <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        {Object.entries(bySupplier).map(([supplierId, supplierItems]) => {
          const supplierTotal = supplierItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
          const { supplierName, supplierType } = supplierItems[0]

          return (
            <div key={supplierId} style={{
              border: '2px solid rgba(16,24,40,0.1)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* En-tête fournisseur */}
              <div style={{
                background: '#f8f9fa',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(16,24,40,0.08)',
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{supplierName}</span>
                  <span style={{ marginLeft: '0.5rem', opacity: 0.55, fontSize: '0.85rem' }}>
                    · {TYPE_LABELS[supplierType] ?? supplierType}
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  CHF {supplierTotal.toFixed(2)}
                </span>
              </div>

              {/* Lignes produits */}
              <div style={{ padding: '0.5rem 0' }}>
                {supplierItems.map(item => (
                  <div key={item.productId} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.6rem 1.25rem',
                    borderBottom: '1px solid rgba(16,24,40,0.05)',
                  }}>
                    <span style={{ fontWeight: 500 }}>{item.productName}</span>

                    {/* Quantité */}
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={item.quantity}
                        min={item.minQuantity}
                        step={item.minQuantity}
                        onChange={e => updateQuantity(item.productId, Math.max(item.minQuantity, Number(e.target.value)))}
                        style={{
                          width: 60,
                          padding: '0.25rem 0.4rem',
                          border: '1px solid rgba(16,24,40,0.15)',
                          borderRadius: 6,
                          textAlign: 'center',
                          fontSize: '0.9rem',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', opacity: 0.55 }}>{item.unit}</span>
                    </div>

                    {/* Sous-total ligne */}
                    <span style={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                      CHF {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>

                    {/* Supprimer */}
                    <button
                      onClick={() => removeItem(item.productId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#c0392b',
                        fontSize: '1.1rem',
                        padding: '0.2rem',
                      }}
                      aria-label={`Supprimer ${item.productName}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Sous-total fournisseur */}
                <div style={{
                  padding: '0.6rem 1.25rem',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#f8f9fa',
                }}>
                  Sous-total : CHF {supplierTotal.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Link
          href="/commandes"
          locale={locale}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: 8,
            border: '1px solid rgba(16,24,40,0.15)',
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Continuer mes achats
        </Link>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            background: '#DC7F00',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.6rem 2rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? 'Envoi en cours…'
            : `Confirmer ${supplierCount > 1 ? `les ${supplierCount} commandes` : 'la commande'} — CHF ${globalTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

import type { CSSProperties } from 'react'

const breadcrumbStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.8rem',
  color: 'rgba(16,24,40,0.4)',
  marginBottom: '1.5rem',
}

const crumbActiveStyle: CSSProperties = {
  color: 'rgba(16,24,40,0.75)',
  fontWeight: 600,
}
