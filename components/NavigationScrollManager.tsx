'use client'

import { useEffect, useLayoutEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { scrollPageToTopPersistently } from '@/lib/scroll'

function isInternalNavLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false
  }
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  try {
    const url = new URL(href, window.location.href)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

/** Force le scroll en haut à chaque navigation (conteneur #app-scroll). */
export default function NavigationScrollManager() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const routeKey = search ? `${pathname}?${search}` : pathname

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavLink(anchor)) return
      scrollPageToTopPersistently()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useLayoutEffect(() => {
    scrollPageToTopPersistently()
  }, [routeKey])

  useEffect(() => {
    scrollPageToTopPersistently()
    const timers = [100, 250, 500, 800, 1200].map(ms =>
      window.setTimeout(scrollPageToTopPersistently, ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [routeKey])

  return null
}
