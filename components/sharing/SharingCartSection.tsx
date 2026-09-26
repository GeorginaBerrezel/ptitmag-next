'use client'

import { Link } from '@/i18n/navigation'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import { formatShareQty } from '@/lib/sharing/from-product'
import { useSharePrototypeVisible, useSharing } from '@/lib/sharing/SharingContext'
import styles from '@/app/[locale]/(members)/panier/panier.module.css'

export function useYoursShareCount(): number {
  const shareVisible = useSharePrototypeVisible()
  const { pools, viewerId } = useSharing()
  if (!shareVisible || !viewerId) return 0
  return pools.filter(pool => pool.contributions.some(row => row.memberId === viewerId && !row.ordered)).length
}

/** @deprecated préférer useYoursShareCount */
export const useYoursReadyShareCount = useYoursShareCount

export default function SharingCartSection() {
  const shareVisible = useSharePrototypeVisible()
  const { pools, viewerId } = useSharing()
  if (!shareVisible || !viewerId) return null

  const yours = pools.filter(pool => pool.contributions.some(row => row.memberId === viewerId && !row.ordered))
  if (yours.length === 0) return null

  return (
    <section className={styles.shareBox} aria-labelledby="share-cart-title">
      <h2 id="share-cart-title" className={styles.shareTitle}>Produits partagés</h2>
      <p className={styles.shareHint}>
        Ces parts ne sont pas dans le panier. Elles partent seules à la date du fournisseur.
        Tu peux encore les retirer dans Partages.
      </p>
      <ul className={styles.shareList}>
        {yours.map(pool => {
          const mine = pool.contributions.find(row => row.memberId === viewerId)!
          const when = pool.status === 'deferred'
            ? 'gardée jusqu’à la prochaine ouverture'
            : pool.deadlineAt
              ? `part le ${formatSupplierOrderDeadline(pool.deadlineAt)}`
              : 'part à la date du fournisseur'
          return (
            <li key={pool.id} className={styles.shareLine}>
              <div>
                <strong>{pool.product.name}</strong>
                <p className={styles.shareMeta}>
                  Ta part : {formatShareQty(mine.quantity, pool.product.unit)} · {when}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <Link href="/commandes/partage" className={styles.shareBtn} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginTop: '0.75rem' }}>
        Voir les partages
      </Link>
    </section>
  )
}
