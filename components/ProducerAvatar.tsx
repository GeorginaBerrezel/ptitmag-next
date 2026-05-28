'use client'

import { useState } from 'react'
import Image from 'next/image'

type Props = {
  logo?: string
  emoji: string
  name: string
  size?: number
}

export default function ProducerAvatar({ logo, emoji, name, size = 48 }: Props) {
  const [failed, setFailed] = useState(false)
  const showLogo = logo && !failed

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(16,24,40,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showLogo ? (
        <Image
          src={logo}
          alt=""
          width={size}
          height={size}
          style={{ objectFit: 'contain', padding: size > 40 ? 4 : 2 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden style={{ fontSize: size * 0.46, lineHeight: 1 }}>{emoji}</span>
      )}
    </div>
  )
}
