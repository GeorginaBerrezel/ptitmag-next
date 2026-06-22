'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useCart } from '@/lib/cart/CartContext'
import { resolveQuantityRules } from '@/lib/catalog/bioterroir-quantity'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { normalizeQuantity } from '@/lib/catalog/quantity-rules'
import type { Product } from '@/lib/supabase/products'
import styles from './wishlist-bulk-add.module.css'

type Props = {
  products: Product[]
  lastQuantities: Record<string, number>
  locale: 'fr' | 'en'
}

function resolveDefaultQuantity(product: Product, lastQuantities: Record<string, number>): number {
  const rules = resolveQuantityRules(product)
  const fromHistory = lastQuantities[product.id]
  if (fromHistory != null && fromHistory > 0) {
    return normalizeQuantity(fromHistory, rules)
  }
  return normalizeQuantity(rules.minQuantity, rules)
}

export default function WishlistBulkAdd({ products, lastQuantities, locale }: Props) {
  const { addItem } = useCart()
  const [nowMs] = useState(() => Date.now())
  const [modalOpen, setModalOpen] = useState(false)
  const [done, setDone] = useState<{ added: number; skipped: string[] } | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  const orderable = products.filter(p => productOrderableAt(p, nowMs))
  const skipped = products.filter(p => !productOrderableAt(p, nowMs))

  const openModal = useCallback(() => {
    setDone(null)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!modalOpen) return

    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      if (e.key !== 'Tab' || focusable.length === 0) return
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, closeModal])

  function handleConfirm() {
    let added = 0
    for (const product of orderable) {
      if (!product.supplier || product.unit_price == null) continue
      const rules = resolveQuantityRules(product)
      const quantity = resolveDefaultQuantity(product, lastQuantities)
      addItem({
        productId: product.id,
        productName: product.name,
        supplierRef: product.supplier_ref,
        supplierId: product.supplier.id,
        supplierName: product.supplier.name,
        supplierType: product.supplier.type,
        quantity,
        unitPrice: product.unit_price,
        unit: product.unit,
        minQuantity: rules.minQuantity,
        allowsPartialOrder: rules.allowsPartialOrder,
      })
      added += 1
    }
    setDone({ added, skipped: skipped.map(p => p.name) })
    setModalOpen(false)
  }

  if (products.length === 0) return null

  const orderableLabel =
    orderable.length === 1
      ? '1 produit disponible'
      : `${orderable.length} produits disponibles`

  return (
    <div className={styles.toolbar}>
      <p className={styles.toolbarLabel}>Raccourci commande</p>
      <div className={styles.toolbarRow}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.bulkBtn}
          onClick={openModal}
          disabled={orderable.length === 0}
        >
          Tout mettre au panier
          {orderable.length > 0 && (
            <span className={styles.bulkCount}>{orderable.length}</span>
          )}
        </button>
      </div>
      <p className={styles.hint}>
        {orderable.length > 0
          ? `${orderableLabel} — quantités selon votre dernière commande. Modifiables dans le panier.`
          : 'Aucun produit disponible à la commande pour le moment (fournisseurs fermés).'}
      </p>

      {done != null && done.added > 0 && (
        <p className={styles.success} role="status">
          {done.added} produit{done.added > 1 ? 's' : ''} ajouté{done.added > 1 ? 's' : ''} au panier.{' '}
          <Link href="/panier" locale={locale} className={styles.cartLink}>
            Voir le panier
          </Link>
        </p>
      )}

      {done != null && done.skipped.length > 0 && (
        <p className={styles.skippedNote}>
          {done.skipped.length} produit{done.skipped.length > 1 ? 's' : ''} non ajouté
          {done.skipped.length > 1 ? 's' : ''} — commandes fermées ou produit indisponible.
        </p>
      )}

      {modalOpen && (
        <div className={styles.backdrop} role="presentation" onClick={closeModal}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={styles.dialog}
            onClick={e => e.stopPropagation()}
          >
            <h2 id={titleId} className={styles.dialogTitle}>
              Mettre ces produits au panier ?
            </h2>
            <p id={descId} className={styles.dialogText}>
              {orderable.length === 1
                ? '1 produit avec la quantité de votre dernière commande (ou le minimum indiqué). Vous pourrez ajuster chaque ligne dans le panier.'
                : `${orderable.length} produits avec les quantités de vos dernières commandes (ou le minimum de chaque article). Vous pourrez ajuster chaque ligne dans le panier.`}
            </p>

            {skipped.length > 0 && (
              <div className={styles.skippedBox}>
                <p className={styles.skippedTitle}>
                  {skipped.length} produit{skipped.length > 1 ? 's' : ''} non inclus{skipped.length > 1 ? '' : ''} :
                </p>
                <ul className={styles.skippedList}>
                  {skipped.slice(0, 5).map(p => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                  {skipped.length > 5 && (
                    <li>… et {skipped.length - 5} autre{skipped.length - 5 > 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>
            )}

            <div className={styles.dialogActions}>
              <button type="button" className={`btn btn-outline ${styles.dialogBtn}`} onClick={closeModal}>
                Annuler
              </button>
              <button
                type="button"
                className={`btn btn-primary ${styles.dialogBtn}`}
                onClick={handleConfirm}
                disabled={orderable.length === 0}
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
