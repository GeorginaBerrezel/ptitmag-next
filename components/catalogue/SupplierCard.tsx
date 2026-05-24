'use client'

type Props = {
  name: string
  typeLabel: string
  description?: string
  emoji?: string
  productCount: number
  categoryCount: number
  isOpen: boolean
  statusLabel: string
  onClick: () => void
}

export default function SupplierCard({
  name,
  typeLabel,
  description,
  emoji,
  productCount,
  categoryCount,
  isOpen,
  statusLabel,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.65rem',
        width: '100%',
        textAlign: 'left',
        padding: '1rem 1.1rem',
        background: '#fff',
        border: '1.5px solid rgba(16,24,40,0.1)',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        boxShadow: '0 1px 3px rgba(16,24,40,0.04)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#1a1a2e'
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,24,40,0.08)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(16,24,40,0.1)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
          {emoji && (
            <span
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#f3f4f6',
                border: '1px solid rgba(16,24,40,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              {emoji}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#1a1a2e', lineHeight: 1.25 }}>{name}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(16,24,40,0.55)' }}>{typeLabel}</p>
            {description && (
              <p style={{
                margin: '0.45rem 0 0',
                fontSize: '0.82rem',
                color: 'rgba(16,24,40,0.62)',
                lineHeight: 1.45,
              }}>
                {description}
              </p>
            )}
          </div>
        </div>
        <span style={{ fontSize: '1.1rem', opacity: 0.35, lineHeight: 1, flexShrink: 0 }} aria-hidden>›</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600,
          background: '#f3f4f6', color: '#374151',
          borderRadius: 999, padding: '0.15rem 0.55rem',
        }}>
          {productCount} produit{productCount > 1 ? 's' : ''}
        </span>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600,
          background: '#f0f4ff', color: '#3b4fa8',
          borderRadius: 999, padding: '0.15rem 0.55rem',
        }}>
          {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}
        </span>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600,
          background: isOpen ? '#ecfdf5' : '#f3f4f6',
          color: isOpen ? '#047857' : '#4b5563',
          borderRadius: 999, padding: '0.15rem 0.55rem',
          lineHeight: 1.35,
        }}>
          {statusLabel}
        </span>
      </div>

      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#DC7F00' }}>
        Voir le catalogue →
      </span>
    </button>
  )
}
