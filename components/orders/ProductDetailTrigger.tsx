'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { getBiopartnerProductInfoUrl } from '@/lib/catalog/biopartner-product-url'
import {
  getProductImageUrl,
  getProductImagePresentation,
  PRODUCT_IMAGE_PLACEHOLDER,
  showProductImage,
  shouldBypassNextImageOptimizer,
} from '@/lib/catalog/product-image'
import { getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import CielPriceHint from '@/components/catalog/CielPriceHint'
import type { Product } from '@/lib/supabase/products'
import type { ProductDetailPreview } from '@/components/orders/product-detail-preview'
import styles from './ProductDetailSheet.module.css'

type Props = {
  preview: ProductDetailPreview
  /** Libellé du bouton (défaut : nom du produit). */
  label?: string
  className?: string
}

function catalogueSearchQuery(preview: ProductDetailPreview, product: Product | null): string {
  const ref = product?.supplier_ref?.trim() || preview.supplierRef?.trim()
  if (ref) return ref
  return preview.name
}

export default function ProductDetailTrigger({ preview, label, className }: Props) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const applyCielMarkup = useApplyCielMarkup()

  const [open, setOpen] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  const openSheet = useCallback(() => {
    setOpen(true)
    setFetchError(null)
    setLoading(true)
    void fetch(`/api/catalogue/product?id=${encodeURIComponent(preview.productId)}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? 'Chargement impossible')
        }
        return res.json() as Promise<Product>
      })
      .then(data => setProduct(data))
      .catch(err => setFetchError((err as Error).message))
      .finally(() => setLoading(false))
  }, [preview.productId])

  const closeSheet = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const sheet = sheetRef.current
    if (!sheet) return

    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeSheet()
        return
      }
      if (e.key !== 'Tab' || focusable.length === 0) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeSheet])

  const displayName = product?.name ?? preview.name
  const supplierName = product?.supplier?.name ?? preview.supplierName
  const supplierType = product?.supplier?.type ?? preview.supplierType
  const unit = product?.unit ?? preview.unit
  const supplierRef = product?.supplier_ref ?? preview.supplierRef
  const catalogueUnitPrice = product?.unit_price ?? preview.unitPrice
  const biopartnerUrl = product
    ? getBiopartnerProductInfoUrl(product)
    : preview.supplierRef && preview.supplierName
      ? getBiopartnerProductInfoUrl({
          supplier_ref: preview.supplierRef,
          supplier: { name: preview.supplierName },
        })
      : null

  const effectiveCataloguePrice =
    catalogueUnitPrice != null
      ? getEffectiveUnitPrice(
          {
            unitPrice: catalogueUnitPrice,
            minQuantity: product?.min_quantity ?? 1,
            allowsPartialOrder: product?.allows_partial_order ?? false,
            quantity: preview.quantity ?? 1,
          },
          { applyCielMarkup },
        )
      : null

  const imageProduct = product ?? ({
    id: preview.productId,
    name: preview.name,
    supplier_ref: preview.supplierRef ?? null,
    supplier: preview.supplierName
      ? { name: preview.supplierName, type: (preview.supplierType ?? 'autre') as 'local' | 'grossiste_bio' | 'autre' }
      : null,
  } as Product)

  const supportsImage = showProductImage(imageProduct)
  const imageUrl = supportsImage ? (getProductImageUrl(imageProduct) ?? PRODUCT_IMAGE_PLACEHOLDER) : null
  const imagePresentation = getProductImagePresentation(imageProduct, imageUrl)

  const searchQ = catalogueSearchQuery(preview, product)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className ?? styles.trigger}
        onClick={openSheet}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label ?? preview.name}
      </button>

      {open && (
        <div className={styles.backdrop} role="presentation" onClick={closeSheet}>
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={styles.sheet}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.handle} aria-hidden="true" />

            <h2 id={titleId} className={styles.title}>{displayName}</h2>
            {supplierName && (
              <p className={styles.supplier}>{supplierName}</p>
            )}

            <div id={descId}>
              {loading && <p className={styles.loading}>Chargement…</p>}
              {fetchError && (
                <p className={styles.error}>{fetchError}</p>
              )}

              {!loading && imageUrl && (
                <div className={styles.imageWrap}>
                  <Image
                    src={imageUrl}
                    alt=""
                    width={480}
                    height={360}
                    className={styles.image}
                    style={{
                      objectFit: imagePresentation.objectFit,
                      objectPosition: imagePresentation.objectPosition,
                    }}
                    unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
                  />
                </div>
              )}

              <div className={styles.metaGrid}>
                {preview.quantity != null && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Quantité</span>
                    <span className={styles.metaValue}>
                      {preview.quantity}{unit ? ` ${unit}` : ''}
                    </span>
                  </div>
                )}
                {preview.orderUnitPrice != null && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Prix commandé</span>
                    <span className={styles.metaValue}>
                      CHF {preview.orderUnitPrice.toFixed(2)} / unité
                    </span>
                  </div>
                )}
                {effectiveCataloguePrice != null && unit && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Prix catalogue</span>
                    <span className={styles.metaValue}>
                      CHF {effectiveCataloguePrice.toFixed(2)} / {unit}
                    </span>
                  </div>
                )}
                {supplierRef && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Référence</span>
                    <span className={styles.metaValue}>{supplierRef}</span>
                  </div>
                )}
                {product?.category && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Catégorie</span>
                    <span className={styles.metaValue}>{product.category}</span>
                  </div>
                )}
                {supplierType && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Type</span>
                    <span className={styles.metaValue}>
                      {supplierType === 'local' ? 'Producteur local' : supplierType === 'grossiste_bio' ? 'Grossiste bio' : 'Autre'}
                    </span>
                  </div>
                )}
              </div>

              {applyCielMarkup && catalogueUnitPrice != null && (
                <CielPriceHint baseUnitPrice={catalogueUnitPrice} />
              )}

              {product?.description && (
                <p className={styles.description}>{product.description}</p>
              )}

              <div className={styles.linkStack}>
                {biopartnerUrl && (
                  <>
                    <a
                      href={biopartnerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.externalLink}
                    >
                      Allergènes et fiche Biopartner ↗
                    </a>
                    <p className={styles.externalHint}>
                      Si le lien ne s&apos;ouvre pas, le produit n&apos;est peut-être plus sur le site Biopartner — contactez le magasin.
                    </p>
                  </>
                )}
                <Link
                  href={`/commandes?q=${encodeURIComponent(searchQ)}`}
                  locale={locale as 'fr' | 'en'}
                  className={styles.catalogueLink}
                  onClick={closeSheet}
                >
                  Voir dans le catalogue
                </Link>
              </div>
            </div>

            <button type="button" className={styles.closeBtn} onClick={closeSheet}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
