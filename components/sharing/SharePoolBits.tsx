'use client'

import { formatShareProgress, formatShareQty } from '@/lib/sharing/from-product'
import { shareTargetOf } from '@/lib/sharing/pool-math'
import { useSharing } from '@/lib/sharing/SharingContext'
import type { ShareActionResult, SharePoolView } from '@/lib/sharing/types'
import styles from './sharing.module.css'

export function ShareProgress({ pool }: { pool: SharePoolView }) {
  const { viewerId } = useSharing()
  const { product } = pool
  const target = shareTargetOf(product)
  const pct = Math.min(100, (pool.filled / target) * 100)
  return (
    <div className={styles.progressBlock}>
      <div className={styles.progressTrack} aria-hidden>
        <div
          className={`${styles.progressFill} ${pool.isFull ? styles.progressFillReady : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={styles.progressLabel}>
        {formatShareProgress(pool.filled, target, pool.remaining, product.unit, pool.isFull)}
      </p>
      {pool.isFull && pool.contributions.length === 1 && (
        <p className={styles.soloWarn}>
          Tu as pris tout le carton seule. Ce n’est pas un partage : retire ta part, puis choisis une petite part.
        </p>
      )}
      <ul className={styles.people}>
        {pool.contributions.map(c => (
          <li key={c.memberId} className={styles.chip}>
            {c.memberId === viewerId ? 'Toi' : c.displayName}
            {' · '}
            {formatShareQty(c.quantity, product.unit)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ShareSimulateRow({
  pool,
  onError,
  onNotice,
}: {
  pool: SharePoolView
  onError: (msg: string | null) => void
  onNotice?: (msg: string | null) => void
}) {
  const { removeYours, viewerId } = useSharing()
  const yours = pool.contributions.find(c => c.memberId === viewerId)
  const locked = pool.contributions.some(c => c.ordered)

  async function apply(result: Promise<ShareActionResult>) {
    const next = await result
    onError(next.error ?? null)
    onNotice?.(next.notice ?? null)
  }

  if (yours?.ordered) {
    return <p className={styles.progressLabel}>Ta part est commandée.</p>
  }

  return (
    <div className={styles.simRow}>
      {yours && !locked && (
        <button type="button" className={styles.simBtn} onClick={() => void apply(removeYours(pool.id))}>
          Retirer ma part
        </button>
      )}
      {pool.isFull && yours && !locked && (
        <p className={styles.progressLabel}>Tu peux encore retirer ta part avant la date. Ensuite la commande part seule.</p>
      )}
    </div>
  )
}
