'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export default function HorizontalScrollStrip({
  children,
  className = '',
  ariaLabel = 'Filtres',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [updateArrows, children])

  function scrollByPage(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.max(160, el.clientWidth * 0.75) * direction
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className={`catalogue-scroll-strip ${className}`.trim()}>
      <button
        type="button"
        className="catalogue-scroll-strip__arrow catalogue-scroll-strip__arrow--left"
        aria-label="Défiler vers la gauche"
        disabled={!canScrollLeft}
        onClick={() => scrollByPage(-1)}
      >
        ‹
      </button>
      <div
        ref={scrollRef}
        className="catalogue-scroll-strip__track"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {children}
      </div>
      <button
        type="button"
        className="catalogue-scroll-strip__arrow catalogue-scroll-strip__arrow--right"
        aria-label="Défiler vers la droite"
        disabled={!canScrollRight}
        onClick={() => scrollByPage(1)}
      >
        ›
      </button>
    </div>
  )
}
