'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { APP_SCROLL_ID } from '@/lib/scroll'
import styles from './back-to-top.module.css'

/** Visible après environ un écran. Pas lié au sens du scroll : une fois en bas, le bouton est déjà là. */
function showAfter(root: HTMLElement): number {
  return Math.round(root.clientHeight * 0.75)
}

export default function BackToTop() {
  const t = useTranslations('nav')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const root = document.getElementById(APP_SCROLL_ID)
    if (!root) return

    function onScroll() {
      const scroller = document.getElementById(APP_SCROLL_ID)
      if (!scroller) return
      setVisible(scroller.scrollTop > showAfter(scroller))
    }

    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  function handleClick() {
    const root = document.getElementById(APP_SCROLL_ID)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleClick}
      aria-label={t('backToTop')}
    >
      <ArrowUp size={22} strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
