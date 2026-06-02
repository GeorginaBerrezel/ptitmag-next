'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

type CompteConfirmeBannerProps = {
  /** Connexion : après le lien e-mail. Mon compte : déjà connecté. */
  variant?: 'connexion' | 'mon-compte'
}

export default function CompteConfirmeBanner({ variant = 'mon-compte' }: CompteConfirmeBannerProps) {
  const searchParams = useSearchParams()
  const confirmed = searchParams.get('compte_confirme') === '1'

  useEffect(() => {
    if (!confirmed) return
    const url = new URL(window.location.href)
    url.searchParams.delete('compte_confirme')
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [confirmed])

  if (!confirmed) return null

  return (
    <div
      role="status"
      style={{
        background: '#e8f5e9',
        border: '1px solid #a5d6a7',
        borderRadius: 12,
        padding: '1rem 1.15rem',
        marginBottom: '1rem',
        fontSize: '0.92rem',
        lineHeight: 1.6,
        color: '#1b5e20',
      }}
    >
      <strong>E-mail confirmé — bienvenue !</strong>
      <br />
      {variant === 'connexion' ? (
        <>
          Connectez-vous ci-dessous avec le mot de passe choisi à l&apos;inscription.
          Joel validera votre adhésion avant l&apos;accès au catalogue.
        </>
      ) : (
        <>
          Votre compte est actif. Joel validera votre adhésion avant l&apos;accès au catalogue ;
          il peut vous contacter via les coordonnées indiquées à l&apos;inscription.
        </>
      )}
    </div>
  )
}
