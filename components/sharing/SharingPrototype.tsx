'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { PRODUCT_IMAGE_PLACEHOLDER, shouldBypassNextImageOptimizer } from '@/lib/catalog/product-image'
import { formatShareNumber, formatShareQty } from '@/lib/sharing/from-product'
import { SHARE_MESSAGES } from '@/lib/sharing/eligibility'
import { shareStepOf, shareTargetOf, wouldTakeWholeCarton } from '@/lib/sharing/pool-math'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import { useSharing } from '@/lib/sharing/SharingContext'
import type { ShareIfIncomplete, SharePoolView } from '@/lib/sharing/types'
import { ShareProgress, ShareSimulateRow } from './SharePoolBits'
import card from '@/components/ProductCard.module.css'
import shareStyles from './sharing.module.css'

type ShareTab = 'open' | 'ready'

export function WaitingSharePools() {
  const { openPools, readyPools } = useSharing()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<ShareTab>(openPools.length > 0 ? 'open' : 'ready')
  const shown = tab === 'open' ? openPools : readyPools

  if (openPools.length === 0 && readyPools.length === 0) {
    return (
      <div className={shareStyles.empty}>
        <p><strong>Aucun partage pour l’instant.</strong></p>
        <p>
          Quand quelqu’un clique Partager sur un lot, le carton apparaît ici.
        </p>
        <Link href="/commandes" className={shareStyles.emptyCta}>
          Retour au catalogue
        </Link>
      </div>
    )
  }

  return (
    <div>
      {error && <p className={shareStyles.alert} role="alert">{error}</p>}
      {notice && <p className={shareStyles.notice} role="status">{notice}</p>}

      <div className={shareStyles.tablist} role="tablist" aria-label="Partages">
        <button
          type="button"
          role="tab"
          id="share-tab-open"
          aria-controls="share-panel-open"
          aria-selected={tab === 'open'}
          className={tab === 'open' ? `${shareStyles.tab} ${shareStyles.tabActive}` : shareStyles.tab}
          onClick={() => setTab('open')}
        >
          En attente
          <span className={shareStyles.tabCount}>{openPools.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="share-tab-ready"
          aria-controls="share-panel-ready"
          aria-selected={tab === 'ready'}
          className={tab === 'ready' ? `${shareStyles.tab} ${shareStyles.tabActive}` : shareStyles.tab}
          onClick={() => setTab('ready')}
        >
          Complets
          <span className={shareStyles.tabCount}>{readyPools.length}</span>
        </button>
      </div>

      <div
        id={tab === 'open' ? 'share-panel-open' : 'share-panel-ready'}
        role="tabpanel"
        aria-labelledby={tab === 'open' ? 'share-tab-open' : 'share-tab-ready'}
      >
        {shown.length === 0 ? (
          <p className={shareStyles.empty}>
            {tab === 'open'
              ? 'Rien en attente. Un carton plein se trouve dans Complets.'
              : 'Aucun carton complet. Il reste dans En attente tant qu’il manque des parts.'}
          </p>
        ) : (
          <div className={shareStyles.list}>
            {shown.map(pool => (
              <ShareListCard
                key={pool.id}
                pool={pool}
                onError={setError}
                onNotice={setNotice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShareListCard({
  pool,
  onError,
  onNotice,
}: {
  pool: SharePoolView
  onError: (msg: string | null) => void
  onNotice: (msg: string | null) => void
}) {
  const { startOrJoin, setIfIncomplete, viewerId } = useSharing()
  const product = pool.product
  const target = shareTargetOf(product)
  const step = shareStepOf(product)
  const yours = pool.contributions.find(c => c.memberId === viewerId)
  const locked = pool.contributions.some(c => c.ordered)
  const maxQty = Math.max(step, pool.remaining + (yours?.quantity ?? 0))
  const [qty, setQty] = useState(yours?.quantity ?? step)
  const policy: ShareIfIncomplete = pool.ifIncomplete ?? 'rollover'
  const showShareForm = (!pool.isFull || Boolean(yours)) && !locked

  function clamp(n: number) {
    const rounded = Math.round(n / step) * step
    return Math.min(maxQty, Math.max(step, Number(rounded.toFixed(3))))
  }

  async function handleShare() {
    if (wouldTakeWholeCarton(qty, target)) {
      onNotice(null)
      onError(SHARE_MESSAGES.wholeCarton)
      return
    }
    const result = await startOrJoin(product, qty)
    onError(result.error ?? null)
    onNotice(result.notice ?? null)
  }

  const imageUrl = product.imageUrl || PRODUCT_IMAGE_PLACEHOLDER

  return (
    <article id={pool.id} className={shareStyles.listCard}>
      <div className={shareStyles.listImage}>
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
          sizes="76px"
          style={{ objectFit: 'contain', objectPosition: 'center' }}
        />
      </div>
      <div className={shareStyles.listHead}>
        <h2 className={shareStyles.listTitle}>{product.name}</h2>
        <p className={shareStyles.listMeta}>
          {product.supplierName}
          {' · '}
          {pool.isFull ? 'Complet' : 'En attente'}
          {' · '}
          carton {formatShareQty(target, product.unit)}
          {pool.deadlineAt ? ` · limite ${formatSupplierOrderDeadline(pool.deadlineAt)}` : ''}
        </p>
        <p className={shareStyles.listPrice}>
          {showShareForm ? (
            <>
              ta part CHF {(qty * product.unitPrice).toFixed(2)}
              <span className={shareStyles.listPriceUnit}>
                {' · '}
                CHF {product.unitPrice.toFixed(2)}/{product.unit}
              </span>
            </>
          ) : (
            <>
              CHF {product.unitPrice.toFixed(2)}
              <span className={shareStyles.listPriceUnit}>/{product.unit}</span>
            </>
          )}
        </p>
      </div>

      <div className={shareStyles.listBody}>
      <ShareProgress pool={pool} />

      {showShareForm && (
        <div className={shareStyles.listActions}>
          <div
            className={card.qtyRow}
            role="group"
            aria-label={`Ma part : ${formatShareQty(qty, product.unit)}`}
          >
            <button
              type="button"
              onClick={() => setQty(q => clamp(q - step))}
              disabled={qty <= step}
              aria-label="Diminuer ma part"
              className={card.qtyBtn}
            >
              −
            </button>
            <span className={card.qtyValue} aria-hidden>
              {formatShareNumber(qty)}
            </span>
            <button
              type="button"
              onClick={() => setQty(q => clamp(q + step))}
              disabled={qty >= maxQty}
              aria-label="Augmenter ma part"
              className={card.qtyBtn}
            >
              +
            </button>
            <span className={card.qtyUnit}>{product.unit}</span>
          </div>
          <button type="button" className={shareStyles.listBtn} onClick={handleShare}>
            {yours ? 'Enregistrer' : 'Rejoindre'}
          </button>
        </div>
      )}

      {yours && !locked && (
        <div
          className={shareStyles.choiceSet}
          role="group"
          aria-labelledby={`share-end-label-${pool.id}`}
        >
          <p id={`share-end-label-${pool.id}`} className={shareStyles.choiceLegend}>
            Si le carton n’est pas complet{pool.deadlineAt ? ` le ${formatSupplierOrderDeadline(pool.deadlineAt)}` : ' à l’heure limite'}
          </p>
          <label className={shareStyles.choice}>
            <input
              type="radio"
              name={`share-end-${pool.id}`}
              checked={policy === 'rollover'}
              onChange={() => void setIfIncomplete(pool.id, 'rollover')}
            />
            Reporter à la semaine suivante
          </label>
          <label className={shareStyles.choice}>
            <input
              type="radio"
              name={`share-end-${pool.id}`}
              checked={policy === 'cancel'}
              onChange={() => void setIfIncomplete(pool.id, 'cancel')}
            />
            Annuler, personne ne commande
          </label>
        </div>
      )}

      <ShareSimulateRow pool={pool} onError={onError} onNotice={onNotice} />
      </div>
    </article>
  )
}
