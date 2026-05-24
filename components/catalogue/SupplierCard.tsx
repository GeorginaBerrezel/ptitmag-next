'use client'

type Props = {
  name: string
  typeLabel: string
  productCount: number
  categoryCount: number
  isOpen: boolean
  statusLabel: string
  onClick: () => void
}

export default function SupplierCard({
  name,
  typeLabel,
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
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#1a1a2e' }}>{name}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', opacity: 0.55 }}>{typeLabel}</p>
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
