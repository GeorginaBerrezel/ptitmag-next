'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Remonte en haut de page à chaque changement de route. */
export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
