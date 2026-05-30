import { Link } from '@/i18n/navigation'
import { getStatusGuide, type MemberStatusKey } from '@/lib/members/status-guide'

type Props = {
  locale?: string
  variant?: 'compact' | 'full'
  includeNonMembre?: boolean
  linkToMembership?: boolean
}

const ACTIVE_STATUSES: MemberStatusKey[] = ['terre', 'ciel']

export default function MemberStatusGuide({
  locale = 'fr',
  variant = 'compact',
  includeNonMembre = false,
  linkToMembership = false,
}: Props) {
  const guide = getStatusGuide(locale)
  const statuses: MemberStatusKey[] = includeNonMembre
    ? ['non_membre', ...ACTIVE_STATUSES]
    : ACTIVE_STATUSES

  if (variant === 'full') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
      }}>
        {statuses.map(key => {
          const g = guide.statuses[key]
          const isTerre = key === 'terre'
          const isCiel = key === 'ciel'
          return (
            <div
              key={key}
              style={{
                background: '#fff',
                border: isTerre ? '2px solid #2e7d32' : isCiel ? '2px solid #1565c0' : '1px solid rgba(16,24,40,0.12)',
                borderRadius: 16,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <span style={{ fontSize: '1.75rem' }} aria-hidden>{g.emoji}</span>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{g.name}</p>
              <p style={{
                margin: 0,
                fontSize: '0.88rem',
                fontWeight: 700,
                color: isTerre ? '#2e7d32' : isCiel ? '#1565c0' : '#4b5563',
              }}>
                {g.tagline}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.55 }}>
                {g.body}
              </p>
              {g.cotisationHint && (
                <p style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.8rem',
                  opacity: 0.55,
                  lineHeight: 1.5,
                  borderTop: '1px solid rgba(16,24,40,0.06)',
                  paddingTop: '0.65rem',
                }}>
                  {g.cotisationHint}
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '1rem 1.1rem',
    }}>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 700, opacity: 0.75 }}>
        {guide.twoStatusesTitle}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.65rem',
      }}>
        {ACTIVE_STATUSES.map(key => {
          const g = guide.statuses[key]
          return (
            <div
              key={key}
              style={{
                background: '#fff',
                border: '1px solid rgba(16,24,40,0.08)',
                borderRadius: 10,
                padding: '0.75rem 0.85rem',
              }}
            >
              <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.88rem' }}>
                {g.emoji} {g.name}
              </p>
              <p style={{
                margin: '0 0 0.35rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: key === 'terre' ? '#2e7d32' : '#1565c0',
              }}>
                {g.tagline}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.65, lineHeight: 1.5 }}>
                {g.body}
              </p>
            </div>
          )
        })}
      </div>
      {linkToMembership && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
          <Link href="/membership" locale={locale as 'fr' | 'en'} style={{ color: '#1565c0', fontWeight: 600 }}>
            {guide.learnMoreLink}
          </Link>
        </p>
      )}
    </div>
  )
}
