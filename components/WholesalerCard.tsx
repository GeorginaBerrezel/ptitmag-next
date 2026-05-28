'use client'

import ProducerAvatar from '@/components/ProducerAvatar'
import type { Wholesaler } from '@/lib/catalog/wholesalers'
import { getWholesalerLogoPath } from '@/lib/catalog/wholesalers'

type Props = {
  wholesaler: Wholesaler
}

export default function WholesalerCard({ wholesaler }: Props) {
  const logo = getWholesalerLogoPath(wholesaler)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(16,24,40,0.08)',
        borderRadius: 12,
        padding: '1rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <ProducerAvatar logo={logo} emoji={wholesaler.emoji} name={wholesaler.displayName} size={44} />
      <div style={{ minWidth: 0 }}>
        <p className="card-title" style={{ fontSize: '0.88rem', margin: 0 }}>{wholesaler.displayName}</p>
        <p className="card-text" style={{ fontSize: '0.77rem', marginTop: '0.1rem', marginBottom: 0 }}>
          {wholesaler.description}
        </p>
        {wholesaler.website && (
          <a
            href={wholesaler.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#1565c0',
              textDecoration: 'none',
            }}
          >
            Site web →
          </a>
        )}
      </div>
    </div>
  )
}
