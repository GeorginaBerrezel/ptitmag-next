'use client'

import ProducerAvatar from '@/components/ProducerAvatar'
import type { LocalProducer } from '@/lib/catalog/local-producers'
import { getProducerLogoPath } from '@/lib/catalog/local-producers'

type Props = {
  producer: LocalProducer
}

export default function ProducerCard({ producer }: Props) {
  const logo = getProducerLogoPath(producer)

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
        background: 'linear-gradient(135deg, #f0f7f0, #e8f5e9)',
        padding: '1.25rem 1.25rem 1rem',
        display: 'flex',
        gap: '0.85rem',
        alignItems: 'flex-start',
      }}>
        <ProducerAvatar logo={logo} emoji={producer.emoji} name={producer.displayName} size={52} logoIsPhoto={producer.logoIsPhoto} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
            {producer.displayName}
          </h3>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
            fontSize: '0.76rem', color: '#245c2a', fontWeight: 600,
            background: '#fff', borderRadius: 999,
            padding: '0.1rem 0.5rem',
            border: '1px solid #c8e6c9',
            marginRight: '0.35rem',
          }}>
            📍 {producer.location}
          </span>
          <span style={{
            display: 'inline-flex',
            fontSize: '0.72rem', fontWeight: 600,
            color: '#1565c0', background: '#e3f2fd',
            borderRadius: 999, padding: '0.1rem 0.45rem',
          }}>
            {producer.certification}
          </span>
        </div>
      </div>

      <div style={{ padding: '0.85rem 1.25rem 1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <p style={{
          margin: 0, fontSize: '0.8rem', fontWeight: 600,
          color: 'rgba(16,24,40,0.75)',
        }}>
          {producer.products}
        </p>
        <p style={{
          margin: 0, fontSize: '0.84rem',
          color: 'rgba(16,24,40,0.65)', lineHeight: 1.55,
        }}>
          {producer.description}
        </p>
        {producer.website && (
          <a
            href={producer.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 'auto',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#245c2a',
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
