'use client'

import { useState } from 'react'
import Image from 'next/image'

type Props = {
  logo?: string
  emoji: string
  name: string
  size?: number
  /**
   * Photo produit en attendant un vrai logo → remplit le cercle (cover).
   * Logo graphique JPEG/PNG → contain sur fond blanc.
   */
  logoIsPhoto?: boolean
}

export function isLocalProducerImage(src: string): boolean {
  return src.startsWith('/images/producers/') || src.startsWith('/images/wholesalers/')
}

export default function ProducerAvatar({
  logo,
  emoji,
  name,
  size = 48,
  logoIsPhoto = false,
}: Props) {
  const [failed, setFailed] = useState(false)
  const showLogo = logo && !failed
  const inset = !logoIsPhoto && showLogo ? Math.max(4, Math.round(size * 0.12)) : 0

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
        border: '2px solid #fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      title={name}
    >
      {showLogo ? (
        <div
          style={{
            position: 'absolute',
            inset: inset > 0 ? `${inset}px` : 0,
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          <Image
            src={logo}
            alt=""
            fill
            unoptimized={isLocalProducerImage(logo)}
            sizes={`${size}px`}
            style={{
              objectFit: logoIsPhoto ? 'cover' : 'contain',
              objectPosition: 'center',
            }}
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <span aria-hidden style={{ fontSize: size * 0.46, lineHeight: 1 }}>{emoji}</span>
      )}
    </div>
  )
}
