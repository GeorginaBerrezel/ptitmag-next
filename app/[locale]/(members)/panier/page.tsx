'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
import CatalogueAccessPending from '@/components/CatalogueAccessPending'
import { useCart, getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import { hasUcSurcharge } from '@/lib/catalog/pricing'
import { allocateCreditAcrossTotals, roundChf } from '@/lib/members/credit'
import {
  decrementQuantity,
  getMinAllowedQuantity,
  formatQuantityDisplay,
  incrementQuantity,
} from '@/lib/catalog/quantity-rules'
import { Link } from '@/i18n/navigation'
import styles from './panier.module.css'

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
  const applyCielMarkup = useApplyCielMarkup()
  const router = useRouter()
  const [catalogAccess, setCatalogAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [profilePhone, setProfilePhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status, email, phone, credit_balance')
        .single()

      if (data && canAccessCatalog(data)) {
        setCatalogAccess('allowed')
        setCreditBalance(roundChf(Number(data.credit_balance) || 0))
      } else {
        setProfileEmail(data?.email ?? null)
        setProfilePhone(data?.phone ?? null)
        setCatalogAccess('denied')
      }
    })()
  }, [])

  if (catalogAccess === 'loading') {
    return (
      <main className="container" style={{ paddingTop: '3rem', textAlign: 'center', opacity: 0.5 }}>
        Chargement…
      </main>
    )
  }

  if (catalogAccess === 'denied') {
    return (
      <CatalogueAccessPending
        locale={locale}
        profile={{ email: profileEmail, phone: profilePhone }}
      />
    )
  }

  // Grouper par fournisseur
  const bySupplier = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = []
    acc[item.supplierId].push(item)
    return acc
  }, {})

  const supplierCount = Object.keys(bySupplier).length

  const supplierSubtotals = Object.values(bySupplier).map(supplierItems =>
    roundChf(
      supplierItems.reduce(
        (sum, i) => sum + i.quantity * getEffectiveUnitPrice(i, { applyCielMarkup }),
        0,
      ),
    ),
  )
  const estimatedCredit = roundChf(
    allocateCreditAcrossTotals(supplierSubtotals, creditBalance).reduce((s, c) => s + c, 0),
  )
  const payableTotal = roundChf(globalTotal - estimatedCredit)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={clearCart}
            style={{
              background: 'none',
              border: 'none',
              color: '#c0392b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0.25rem 0',
            }}
          >
            Vider le panier
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            {estimatedCredit > 0 && (
              <>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#2e7d32', fontWeight: 600 }}>
                  Avoir appliqué : − CHF {estimatedCredit.toFixed(2)}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  background: '#1a1a2e',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '0.35rem 1rem',
                }}>
                  Total à payer : CHF {payableTotal.toFixed(2)}
                </p>
              </>
            )}
            <p style={{
              margin: 0,
              fontSize: estimatedCredit > 0 ? '0.85rem' : '1.3rem',
              fontWeight: estimatedCredit > 0 ? 500 : 700,
              opacity: estimatedCredit > 0 ? 0.55 : 1,
              ...(estimatedCredit > 0
                ? {}
                : {
                    background: '#1a1a2e',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '0.35rem 1rem',
                  }),
            }}>
              {estimatedCredit > 0 ? `Sous-total : CHF ${globalTotal.toFixed(2)}` : `Total global : CHF ${globalTotal.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>
      <p style={{ opacity: 0.6, marginBottom: applyCielMarkup ? '0.75rem' : '2rem' }}>
        {supplierCount} commande{supplierCount > 1 ? 's' : ''} seront créées (une par fournisseur)
      </p>

      {applyCielMarkup && (
        <p style={{
          margin: '0 0 2rem',
          padding: '0.65rem 1rem',
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: 8,
          color: '#4338ca',
          fontSize: '0.88rem',
          fontWeight: 500,
        }}>
          Membre Ciel — les prix incluent une majoration de +20&nbsp;%.
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {error}
        </p>
      )}

      {/* Sections par fournisseur */}
      <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        {Object.entries(bySupplier).map(([supplierId, supplierItems]) => {
          const supplierTotal = supplierItems.reduce(
            (sum, i) => sum + i.quantity * getEffectiveUnitPrice(i, { applyCielMarkup }),
            0,
          )
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
                {supplierItems.map(item => {
                  const qtyRules = {
                    minQuantity: item.minQuantity,
                    allowsPartialOrder: item.allowsPartialOrder,
                  }
                  const minAllowed = getMinAllowedQuantity(qtyRules)
                  const hasSurcharge = hasUcSurcharge({
                    minQuantity: item.minQuantity,
                    allowsPartialOrder: item.allowsPartialOrder,
                    quantity: item.quantity,
                  })
                  const effectivePrice = getEffectiveUnitPrice(item, { applyCielMarkup })
                  const lineTotal = item.quantity * effectivePrice

                  return (
                    <div key={item.productId} className={styles.line}>
                      {/* Nom + numéro article */}
                      <div className={styles.lineInfo}>
                        <span style={{ fontWeight: 500 }}>{item.productName}</span>
                        {item.supplierRef && (
                          <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.45, fontFamily: 'monospace' }}>
                            Réf. {item.supplierRef}
                          </span>
                        )}
                        {applyCielMarkup && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#5c6bc0', fontWeight: 600 }}>
                            +20% (membre Ciel)
                          </span>
                        )}
                        {hasSurcharge && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#DC7F00', fontWeight: 600 }}>
                            +10% majoration (qté &lt; {item.minQuantity})
                          </span>
                        )}
                      </div>

                      {/* Contrôles quantité */}
                      <div className={styles.lineQty}>
                        <button
                          onClick={() => updateQuantity(item.productId, decrementQuantity(item.quantity, qtyRules))}
                          disabled={item.quantity <= minAllowed}
                          aria-label="Diminuer"
                          style={{
                            width: 28, height: 28,
                            border: '1px solid rgba(16,24,40,0.15)',
                            borderRadius: 6,
                            background: item.quantity <= minAllowed ? '#f5f5f5' : '#fff',
                            color: item.quantity <= minAllowed ? '#bbb' : '#1a1a2e',
                            cursor: item.quantity <= minAllowed ? 'not-allowed' : 'pointer',
                            fontSize: '1rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, flexShrink: 0,
                          }}
                        >−</button>
                        <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                          {formatQuantityDisplay(item.quantity, qtyRules)}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, incrementQuantity(item.quantity, qtyRules))}
                          aria-label="Augmenter"
                          style={{
                            width: 28, height: 28,
                            border: '1px solid rgba(16,24,40,0.15)',
                            borderRadius: 6, background: '#fff', color: '#1a1a2e',
                            cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, flexShrink: 0,
                          }}
                        >+</button>
                        <span style={{ fontSize: '0.78rem', opacity: 0.5, marginLeft: '0.1rem' }}>{item.unit}</span>
                      </div>

                      {/* Sous-total ligne */}
                      <div className={styles.lineTotal}>
                        <span style={{ fontWeight: 600, minWidth: 80, display: 'block' }}>
                          CHF {lineTotal.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                          {effectivePrice.toFixed(2)}/{item.unit}
                        </span>
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className={styles.removeBtn}
                        aria-label={`Supprimer ${item.productName}`}
                      >×</button>
                    </div>
                  )
                })}

                {/* Sous-total fournisseur */}
                <div style={{
                  padding: '0.6rem 1.25rem',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#f8f9fa',
                }}>
                  {applyCielMarkup && (
                    <p style={{
                      margin: '0 0 0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#5c6bc0',
                    }}>
                      Majoration +20&nbsp;% (membre Ciel) incluse
                    </p>
                  )}
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
