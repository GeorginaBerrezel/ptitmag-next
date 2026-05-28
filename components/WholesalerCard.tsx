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
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #eef4fc, #e3f2fd)',
        padding: '1.25rem 1.25rem 1rem',
        display: 'flex',
        gap: '0.85rem',
        alignItems: 'flex-start',
      }}>
        <ProducerAvatar logo={logo} emoji={wholesaler.emoji} name={wholesaler.displayName} size={52} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
            {wholesaler.displayName}
          </h3>
          <span style={{
            display: 'inline-flex',
            fontSize: '0.72rem', fontWeight: 600,
            color: '#1565c0', background: '#fff',
            borderRadius: 999, padding: '0.1rem 0.5rem',
            border: '1px solid #bbdefb',
          }}>
            Grossiste bio
          </span>
        </div>
      </div>

      <div style={{
        padding: '0.85rem 1.25rem 1.25rem',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}>
        <p style={{
          margin: 0, fontSize: '0.84rem',
          color: 'rgba(16,24,40,0.65)', lineHeight: 1.55,
        }}>
          {wholesaler.description}
        </p>
        {wholesaler.website && (
          <a
            href={wholesaler.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 'auto',
              fontSize: '0.8rem',
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
