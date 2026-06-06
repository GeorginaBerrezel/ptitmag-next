'use client'

type Props = {
  name: string
  count: number
  onClick: () => void
}

/** Pastille catégorie — bandeau horizontal (touch 44px, WCAG). */
export default function CategoryPillButton({ name, count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 999,
        border: '1.5px solid rgba(16,24,40,0.12)',
        background: '#fff',
        color: '#1a1a2e',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        minHeight: 44,
        flexShrink: 0,
      }}
    >
      {name}
      {count > 0 ? ` (${count})` : ''}
    </button>
  )
}
