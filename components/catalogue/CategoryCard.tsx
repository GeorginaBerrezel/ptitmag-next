'use client'

type Props = {
  name: string
  productCount: number
  orderableCount: number
  active?: boolean
  onClick: () => void
}

export default function CategoryCard({
  name,
  productCount,
  orderableCount,
  active = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.35rem',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        textAlign: 'left',
        padding: '0.85rem 1rem',
        background: active ? '#1a1a2e' : '#fff',
        color: active ? '#fff' : '#1a1a2e',
        border: active ? '1.5px solid #1a1a2e' : '1.5px solid rgba(16,24,40,0.1)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s, background 0.15s',
        boxShadow: active ? '0 4px 14px rgba(26,26,46,0.15)' : '0 1px 3px rgba(16,24,40,0.04)',
      }}
      onMouseEnter={e => {
        if (active) return
        e.currentTarget.style.borderColor = '#DC7F00'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,127,0,0.12)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (active) return
        e.currentTarget.style.borderColor = 'rgba(16,24,40,0.1)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', width: '100%', minWidth: 0, justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <p style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontWeight: 700,
          fontSize: '0.95rem',
          lineHeight: 1.3,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}>
          {name}
        </p>
        <span style={{ fontSize: '1rem', opacity: active ? 0.7 : 0.35, flexShrink: 0 }} aria-hidden>›</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', opacity: active ? 0.85 : 0.55 }}>
        {productCount} produit{productCount > 1 ? 's' : ''}
        {orderableCount > 0 && orderableCount < productCount
          ? ` · ${orderableCount} commandable${orderableCount > 1 ? 's' : ''}`
          : ''}
      </p>
    </button>
  )
}
