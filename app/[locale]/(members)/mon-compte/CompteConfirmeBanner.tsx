'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CompteConfirmeBanner() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get('compte_confirme') === '1') {
      setVisible(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('compte_confirme')
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [searchParams])

  if (!visible) return null

  return (
    <div style={{
      background: '#e8f5e9',
      border: '1px solid #a5d6a7',
      borderRadius: 12,
      padding: '1rem 1.15rem',
      marginBottom: '1rem',
      fontSize: '0.92rem',
      lineHeight: 1.6,
      color: '#1b5e20',
    }}>
      <strong>E-mail confirmé — bienvenue !</strong>
      <br />
      Votre compte est actif. Joel validera votre adhésion avant l&apos;accès au catalogue ;
      il peut vous contacter via les coordonnées indiquées à l&apos;inscription.
    </div>
  )
}
