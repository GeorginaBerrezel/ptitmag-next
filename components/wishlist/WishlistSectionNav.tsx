'use client'

import { useEffect, useRef, useState } from 'react'
import { APP_SCROLL_ID } from '@/lib/scroll'
import styles from './wishlist-section-nav.module.css'

type Props = {
  manualCount: number
  habitualCount: number
}

const MOBILE_MAX = 767

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

export default function WishlistSectionNav({ manualCount, habitualCount }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [floating, setFloating] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) {
      setFloating(false)
      return
    }

    const root = document.getElementById(APP_SCROLL_ID)
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setFloating(!entry.isIntersecting),
      { root, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isMobile])

  const links = (
    <>
      <a href="#favoris-manuels" className={styles.link}>
        <span className={styles.linkLabel}>Favoris ♥</span>
        <span className={styles.count}>{manualCount}</span>
      </a>
      <a href="#favoris-habituels" className={styles.link}>
        <span className={styles.linkLabel}>Vos habituels</span>
        <span className={styles.count}>{habitualCount}</span>
      </a>
    </>
  )

  const mobileFloatingActive = isMobile && floating

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      <nav
        className={styles.inFlow}
        aria-label="Aller à une section"
        aria-hidden={mobileFloatingActive || undefined}
      >
        {links}
      </nav>
      {isMobile && (
        <nav
          className={[styles.floating, mobileFloatingActive ? styles.floatingVisible : '']
            .filter(Boolean)
            .join(' ')}
          aria-label="Navigation rapide — favoris et habituels"
          aria-hidden={!mobileFloatingActive || undefined}
          inert={!mobileFloatingActive ? true : undefined}
        >
          <div className={styles.floatingInner}>{links}</div>
        </nav>
      )}
    </>
  )
}
