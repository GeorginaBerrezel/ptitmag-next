'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { getSharePlan, isShareEligible, SHARE_MESSAGES } from '@/lib/sharing/eligibility'
import { formatShareCompact, formatShareNumber, productToShare } from '@/lib/sharing/from-product'
import { shareStepOf, shareTargetOf, wouldTakeWholeCarton } from '@/lib/sharing/pool-math'
import { useSharePrototypeVisible, useSharingOptional } from '@/lib/sharing/SharingContext'
import type { Product } from '@/lib/supabase/products'
import shareStyles from './sharing.module.css'
import card from '@/components/ProductCard.module.css'

type Props = {
  product: Product
  minQuantity: number
}

export default function ProductShareActions({ product, minQuantity }: Props) {
  const sharing = useSharingOptional()
  const shareVisible = useSharePrototypeVisible()
  const plan = getSharePlan({ minQuantity, unit: product.unit, unitPrice: product.unit_price })
  const [error, setError] = useState<string | null>(null)

  if (!shareVisible || !sharing || !plan) return null
  if (!isShareEligible({ minQuantity, unit: product.unit, unitPrice: product.unit_price })) return null

  const share = productToShare(product, minQuantity)
  if (!share) return null

  const target = shareTargetOf(share)
  const step = shareStepOf(share)
  const pool = sharing.pools.find(p => p.productId === product.id)
  const yours = pool?.contributions.find(c => c.memberId === sharing.viewerId)

  async function handleShare() {
    if (!sharing || !share) return
    if (wouldTakeWholeCarton(step, target)) {
      setError(SHARE_MESSAGES.wholeCarton)
      return
    }
    const result = await sharing.startOrJoin(share, step, 'rollover')
    setError(result.error ?? null)
  }

  return (
    <div className={shareStyles.sharePanel}>
      {error && <p className={shareStyles.alert} role="alert">{error}</p>}
      {pool ? (
        <div className={shareStyles.shareLine}>
          <div className={shareStyles.shareLineText}>
            <div className={shareStyles.progressTrack} aria-hidden>
              <div
                className={`${shareStyles.progressFill} ${pool.isFull ? shareStyles.progressFillReady : ''}`}
                style={{ width: `${Math.min(100, (pool.filled / target) * 100)}%` }}
              />
            </div>
            <p className={shareStyles.shareStatus}>
              {formatShareCompact(pool.filled, target, pool.isFull)}
              {yours ? ` · toi ${formatShareNumber(yours.quantity)}` : ''}
            </p>
          </div>
          <Link href="/commandes/partage" className={card.shareBtn} style={{ textAlign: 'center', textDecoration: 'none' }}>
            {yours?.ordered ? 'Commandée' : yours ? 'Modifier' : 'Rejoindre'}
          </Link>
        </div>
      ) : (
        <button type="button" className={card.shareBtn} onClick={handleShare}>
          Partager
        </button>
      )}
    </div>
  )
}
