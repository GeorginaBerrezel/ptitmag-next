'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
import CatalogueAccessPending from '@/components/CatalogueAccessPending'
import { useCart, getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import CielPriceHint from '@/components/catalog/CielPriceHint'
import { hasUcSurcharge } from '@/lib/catalog/pricing'
import { previewCreditAtClose, roundChf } from '@/lib/members/credit'
import {
  decrementQuantity,
  getMinAllowedQuantity,
  formatQuantityDisplay,
  incrementQuantity,
} from '@/lib/catalog/quantity-rules'
import { Link } from '@/i18n/navigation'
import { InlineStatus } from '@/components/ui/InlineStatus'
import WishlistButton from '@/components/WishlistButton'
import ProductDetailTrigger from '@/components/orders/ProductDetailTrigger'
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
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <InlineStatus message="Chargement du panier…" centered live="polite" />
      </div>
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

  const creditPreview = previewCreditAtClose(globalTotal, creditBalance)
  const estimatedCredit = creditPreview.applied
  const creditRemaining = creditPreview.remaining
  const payableTotal = creditPreview.payable

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
      <div className={`container ${styles.narrowWrap}`}>
        <div className={styles.successCard}>
          <p className={styles.successIcon} aria-hidden>✓</p>
          <h1 className={styles.successTitle}>Commande confirmée !</h1>
          <p className={styles.successText}>
            Vos commandes ont été enregistrées. L&apos;équipe du p&apos;tit mag vous contactera pour confirmer les détails.
          </p>
          <Link
            href="/mon-compte"
            locale={locale}
            className={styles.successBtn}
          >
            Retour à mon compte
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={`container ${styles.narrowWrap}`}>
        <nav aria-label="Fil d'ariane" className={styles.breadcrumb}>
          <Link href="/" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>Accueil</Link>
          <span aria-hidden>›</span>
          <Link href="/commandes" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>Catalogue</Link>
          <span aria-hidden>›</span>
          <span className={styles.breadcrumbCurrent} aria-current="page">Panier</span>
        </nav>
        <h1 className={styles.pageTitle}>Mon panier</h1>
        <p className={styles.emptyText}>Votre panier est vide.</p>
        <Link
          href="/commandes"
          locale={locale}
          className={styles.ctaPrimary}
        >
          Commander
        </Link>
      </div>
    )
  }

  const confirmLabel = supplierCount > 1
    ? `Confirmer mes ${supplierCount} commandes`
    : 'Confirmer ma commande'

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 720 }}>
      <nav aria-label="Fil d'ariane" className={styles.breadcrumb}>
        <Link href="/" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>Accueil</Link>
        <span aria-hidden>›</span>
        <Link href="/commandes" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>Catalogue</Link>
        <span aria-hidden>›</span>
        <span className={styles.breadcrumbCurrent} aria-current="page">Panier</span>
      </nav>

      <div className={styles.pageHead}>
        <h1 style={{ margin: 0 }}>Mon panier</h1>
        <button type="button" onClick={clearCart} className={styles.clearBtn}>
          Vider le panier
        </button>
      </div>

      <section className={styles.recapCard} aria-label="Récapitulatif du panier">
        <h2 className={styles.recapTitle}>Récapitulatif</h2>
        <div className={styles.recapTotalRow}>
          <span className={styles.recapTotalLabel}>Sous-total produits</span>
          <span className={styles.recapTotalAmount}>CHF {globalTotal.toFixed(2)}</span>
        </div>

        {creditBalance > 0 && (
          <div className={styles.recapPreview}>
            <div className={styles.recapRow}>
              <span className={styles.recapLabel}>Avoir sur votre compte</span>
              <span>CHF {creditBalance.toFixed(2)}</span>
            </div>
            {estimatedCredit > 0 && (
              <div className={styles.recapRow}>
                <span className={styles.recapLabel}>Avoir restant après clôture (estimation)</span>
                <span className={styles.recapCredit}>CHF {creditRemaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {payableTotal > 0 && (
          <div className={`${styles.recapRow} ${styles.recapRowFinal}`}>
            <span className={styles.recapLabel}>À payer au retrait (estimation)</span>
            <span className={styles.recapComplement}>CHF {payableTotal.toFixed(2)}</span>
          </div>
        )}

        <p className={styles.recapNote}>
          Pas de paiement en ligne — la confirmation enregistre votre commande au magasin.
          {creditBalance > 0 && (
            <> Votre avoir sera déduit du solde <strong>à la clôture</strong> de chaque commande (montant définitif après livraison).</>
          )}
        </p>
      </section>

      <p className={styles.supplierNote}>
        {supplierCount} commande{supplierCount > 1 ? 's' : ''} sera{supplierCount > 1 ? 'ont' : ''} créée{supplierCount > 1 ? 's' : ''} (une par fournisseur).
      </p>

      {applyCielMarkup && (
        <p className={styles.cielBanner}>
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
            <div key={supplierId} className={styles.supplierSection}>
              <div className={styles.supplierHeader}>
                <div className={styles.supplierHeaderMain}>
                  <span className={styles.supplierName}>{supplierName}</span>
                  <span className={styles.supplierType}>
                    · {TYPE_LABELS[supplierType] ?? supplierType}
                  </span>
                </div>
                <span className={styles.supplierTotal}>
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
                        <div className={styles.lineNameRow}>
                          <ProductDetailTrigger
                            variant="row"
                            preview={{
                              productId: item.productId,
                              name: item.productName,
                              supplierName: item.supplierName,
                              supplierId: item.supplierId,
                              supplierType: item.supplierType,
                              supplierRef: item.supplierRef,
                              unit: item.unit,
                              unitPrice: item.unitPrice,
                              quantity: item.quantity,
                            }}
                          />
                          <WishlistButton
                            productId={item.productId}
                            productName={item.productName}
                            compact
                          />
                        </div>
                        {item.supplierRef && (
                          <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.45, fontFamily: 'monospace' }}>
                            Réf. {item.supplierRef}
                          </span>
                        )}
                        {applyCielMarkup && (
                          <CielPriceHint baseUnitPrice={item.unitPrice} />
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
                          type="button"
                          onClick={() => updateQuantity(item.productId, decrementQuantity(item.quantity, qtyRules))}
                          disabled={item.quantity <= minAllowed}
                          aria-label="Diminuer"
                          className={styles.qtyBtn}
                        >−</button>
                        <span className={styles.qtyDisplay}>
                          {formatQuantityDisplay(item.quantity, qtyRules)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, incrementQuantity(item.quantity, qtyRules))}
                          aria-label="Augmenter"
                          className={styles.qtyBtn}
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
                  {applyCielMarkup && supplierItems.length > 0 && (
                    <p style={{
                      margin: '0 0 0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      color: 'rgba(16, 24, 40, 0.58)',
                    }}>
                      Prix catalogue Terre + majoration +20&nbsp;% incluse dans les montants ci-dessus
                    </p>
                  )}
                  Sous-total : CHF {supplierTotal.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.actions} aria-busy={loading}>
        <Link href="/commandes" locale={locale} className={styles.continueLink}>
          ← Continuer mes achats
        </Link>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading}
          className={styles.confirmBtn}
          aria-busy={loading}
        >
          {loading ? 'Envoi en cours…' : confirmLabel}
        </button>
      </div>

      {loading && (
        <InlineStatus
          message="Envoi de votre commande au magasin…"
          centered
          live="assertive"
          className={styles.confirmLoading}
        />
      )}
    </div>
  )
}
