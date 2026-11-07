'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { PRODUCT_IMAGE_PLACEHOLDER, isProductImagePlaceholder, shouldBypassNextImageOptimizer } from '@/lib/catalog/product-image'
import { formatShareNumber, formatShareQty } from '@/lib/sharing/from-product'
import { SHARE_MESSAGES } from '@/lib/sharing/eligibility'
import { defaultCoverMax } from '@/lib/sharing/cover'
import { describeShare } from '@/lib/sharing/describe'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import { useSharing } from '@/lib/sharing/SharingContext'
import { shareStepOf, shareTargetOf, wouldTakeWholeCarton } from '@/lib/sharing/pool-math'
import type { SharePoolView } from '@/lib/sharing/types'
import { ShareProgress, ShareSimulateRow } from './SharePoolBits'
import ProductArticleInfo from '@/components/catalog/ProductArticleInfo'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
              : 'Aucun carton complet. Une fois la commande partie, le carton quitte cette page.'}
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
  const { startOrJoin, refresh, viewerId, viewerIsAdmin } = useSharing()
  const product = pool.product
  const target = shareTargetOf(product)
  const step = shareStepOf(product)
  const yours = pool.contributions.find(c => c.memberId === viewerId)
  const locked = pool.contributions.some(c => c.ordered)
  const ordersClosed = pool.status === 'deferred'
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const maxQty = Math.max(step, pool.remaining + (yours?.quantity ?? 0))
  const [qty, setQty] = useState(yours?.quantity ?? step)
  const [imageFailed, setImageFailed] = useState(false)
  const [coverOn, setCoverOn] = useState(Boolean(yours?.coverMax && yours.coverMax > (yours?.quantity ?? 0)))
  const [coverMax, setCoverMax] = useState(
    yours?.coverMax && yours.coverMax > (yours?.quantity ?? 0)
      ? yours.coverMax
      : defaultCoverMax(yours?.quantity ?? step, pool.remaining, target, step),
  )
  const showShareForm = !ordersClosed && (!pool.isFull || Boolean(yours)) && !locked

  useEffect(() => {
    const active = Boolean(yours?.coverMax && yours.coverMax > (yours?.quantity ?? 0))
    setCoverOn(active)
    if (active && yours?.coverMax) setCoverMax(yours.coverMax)
  }, [yours?.coverMax, yours?.quantity])

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
    const result = await startOrJoin(product, qty, 'rollover', coverOn ? coverMax : null)
    onError(result.error ?? null)
    onNotice(result.notice ?? null)
  }

  async function confirmCancel() {
    if (cancelling) return
    setCancelling(true)
    onError(null)
    try {
      const res = await fetch('/api/admin/sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId: pool.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError(typeof data.error === 'string' ? data.error : 'Annulation impossible.')
        return
      }
      setCancelOpen(false)
      onNotice('Partage annulé. Les personnes reçoivent un mail : rien à payer.')
      await refresh()
    } catch {
      onError('Annulation impossible.')
    } finally {
      setCancelling(false)
    }
  }

  async function openNextCarton() {
    const result = await startOrJoin(product, step, 'rollover', null)
    onError(result.error ?? null)
    onNotice(result.error ? null : 'Le carton suivant est dans En attente.')
  }

  const imageUrl = product.imageUrl || PRODUCT_IMAGE_PLACEHOLDER
  const imageIsPlaceholder = imageFailed || isProductImagePlaceholder(imageUrl)

  return (
    <article id={pool.id} className={shareStyles.listCard}>
      <div className={`${shareStyles.listImage}${imageIsPlaceholder ? ` ${shareStyles.listImageEmpty}` : ''}`}>
        {imageIsPlaceholder ? (
          <span className={shareStyles.listImageMark} aria-hidden="true" />
        ) : (
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
            sizes="(max-width: 767px) 76px, 120px"
            style={{ objectFit: 'contain', objectPosition: 'center' }}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className={shareStyles.listHead}>
        <h2 className={shareStyles.listTitle}>{product.name}</h2>
        <p className={shareStyles.listMeta}>
          {product.supplierName}
          {' · '}
          {(pool.cartonCount ?? 1) > 1 ? `Carton ${pool.cartonNumber ?? 1} · ` : ''}
          {pool.isFull ? 'Complet' : 'En attente'}
          {' · '}
          {formatShareQty(target, product.unit)}
          {pool.deadlineAt ? ` · limite ${formatSupplierOrderDeadline(pool.deadlineAt)}` : ''}
        </p>
        <ProductArticleInfo
          productName={product.name}
          supplierRef={product.supplierRef}
          supplierName={product.supplierName}
        />
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
      <ShareOutlook pool={pool} viewerId={viewerId} />

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

      {pool.isFull && !locked && !ordersClosed && (
        <button type="button" className={shareStyles.listBtn} onClick={() => void openNextCarton()}>
          Ouvrir le carton suivant
        </button>
      )}

      {viewerIsAdmin && !locked && (
        <button type="button" className={shareStyles.adminCancel} onClick={() => setCancelOpen(true)}>
          Annuler ce partage
        </button>
      )}
      <ConfirmDialog
        open={cancelOpen}
        title="Annuler ce partage ?"
        description={`${product.name} ne sera pas commandé. Les personnes reçoivent un mail : annulé, rien à payer.`}
        cancelLabel="Garder le partage"
        confirmLabel={cancelling ? 'Annulation…' : 'Annuler le partage'}
        onClose={() => {
          if (!cancelling) setCancelOpen(false)
        }}
        onConfirm={() => void confirmCancel()}
      />

      {showShareForm && (
        <div className={shareStyles.choiceSet}>
          <label className={shareStyles.choice}>
            <input
              type="checkbox"
              checked={coverOn}
              onChange={e => {
                const on = e.target.checked
                setCoverOn(on)
                if (on) setCoverMax(current => Math.max(current, defaultCoverMax(qty, pool.remaining, target, step)))
              }}
            />
            S’il manque des parts à la date, je peux en prendre en plus
          </label>
          {coverOn && (
            <div className={shareStyles.listActions}>
              <p className={shareStyles.choiceHint}>Jusqu’à {formatShareQty(coverMax, product.unit)} au total. Tu n’as pas à revenir sur le site.</p>
              <div className={card.qtyRow} role="group" aria-label={`Maximum : ${formatShareQty(coverMax, product.unit)}`}>
                <button
                  type="button"
                  className={card.qtyBtn}
                  aria-label="Diminuer le maximum"
                  disabled={coverMax <= qty + step - 1e-9}
                  onClick={() => setCoverMax(q => Math.max(qty + step, Number((q - step).toFixed(3))))}
                >
                  −
                </button>
                <span className={card.qtyValue}>{formatShareNumber(coverMax)}</span>
                <button
                  type="button"
                  className={card.qtyBtn}
                  aria-label="Augmenter le maximum"
                  disabled={coverMax >= target - 1e-9}
                  onClick={() => setCoverMax(q => Math.min(target, Number((q + step).toFixed(3))))}
                >
                  +
                </button>
                <span className={card.qtyUnit}>{product.unit}</span>
              </div>
            </div>
          )}
          <p className={shareStyles.choiceHint}>Enregistre pour garder ce choix. La commande part seule à la date.</p>
        </div>
      )}

      <ShareSimulateRow pool={pool} onError={onError} onNotice={onNotice} />
      </div>
    </article>
  )
}

function ShareOutlook({ pool, viewerId }: { pool: SharePoolView; viewerId: string | null }) {
  const text = describeShare({
    isFull: pool.isFull,
    deferred: pool.status === 'deferred',
    remaining: pool.remaining,
    target: shareTargetOf(pool.product),
    unit: pool.product.unit,
    deadlineLabel: pool.deadlineAt ? formatSupplierOrderDeadline(pool.deadlineAt) : null,
    unitPrice: pool.product.unitPrice,
    viewerId,
    contributions: pool.contributions.map(row => ({
      memberId: row.memberId,
      displayName: row.displayName,
      quantity: row.quantity,
      coverMax: row.coverMax ?? null,
      coverAt: row.coverAt ?? null,
    })),
  })
  return (
    <div className={shareStyles.choiceHint}>
      <p className={shareStyles.progressLabel}>{text.headline}</p>
      {text.detail && <p className={shareStyles.choiceHint}>{text.detail}</p>}
    </div>
  )
}
