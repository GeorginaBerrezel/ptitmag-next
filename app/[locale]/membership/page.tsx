import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

// ─── Données statiques ────────────────────────────────────────────────────────
// Les clés "why" dans l'ordre de la traduction, avec un emoji représentatif

const WHY_ITEMS = [
  { key: 'sovereignty',   emoji: '🌾', titleKey: 'why.sovereigntyTitle',   textKey: 'why.sovereigntyText' },
  { key: 'shortCircuits', emoji: '🚲', titleKey: 'why.shortCircuitsTitle',  textKey: 'why.shortCircuitsText' },
  { key: 'ethical',       emoji: '✅', titleKey: 'why.ethicalTitle',        textKey: 'why.ethicalText' },
  { key: 'waste',         emoji: '♻️', titleKey: 'why.wasteTitle',          textKey: 'why.wasteText' },
  { key: 'fairPrice',     emoji: '💚', titleKey: 'why.fairPriceTitle',      textKey: 'why.fairPriceText' },
  { key: 'transparency',  emoji: '🔍', titleKey: 'why.transparencyTitle',   textKey: 'why.transparencyText' },
  { key: 'participation', emoji: '🤝', titleKey: 'why.participationTitle',  textKey: 'why.participationText' },
  { key: 'community',     emoji: '🏘️', titleKey: 'why.communityTitle',      textKey: 'why.communityText' },
]

// ─── Métadonnées SEO ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'membership' })
  return { title: t('seoTitle'), description: t('seoDescription') }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'membership' })

  type TryCard = { title: string; text: string }
  const tryCards = t.raw('tryCards') as TryCard[]

  const STEP_EMOJIS = ['💬', '🧪', '🌿']

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

      {/* ── Bloc intro ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0E1726 0%, #1a3020 100%)',
        borderRadius: 20,
        padding: 'clamp(1.75rem, 5vw, 2.75rem)',
        color: '#fff',
        marginBottom: '2.5rem',
      }}>
        <p style={{
          margin: '0 0 0.5rem',
          fontSize: '0.78rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#cda867',
          fontWeight: 700,
        }}>
          Le p&apos;tit mag · St-Romain (Ayent)
        </p>
        <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800 }}>
          {t('title')}
        </h1>
        <p style={{ margin: 0, opacity: 0.82, maxWidth: 580, lineHeight: 1.7, fontSize: '1rem' }}>
          {t('intro')}
        </p>
      </div>

      {/* ── Cotisations ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>
          Cotisations
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {/* Cotisation ordinaire */}
          <div style={{
            background: '#fff', border: '2px solid #0E1726',
            borderRadius: 16, padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.75rem' }}>🌱</span>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Ordinaire</p>
            <p style={{
              margin: 0, fontSize: '1.6rem', fontWeight: 800,
              color: '#0E1726',
            }}>
              CHF 30
              <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.6 }}> /mois</span>
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.65, lineHeight: 1.5 }}>
              Par adulte — accès complet au catalogue et aux commandes groupées.
            </p>
          </div>

          {/* Cotisation douce */}
          <div style={{
            background: '#fff', border: '1px solid rgba(16,24,40,0.1)',
            borderRadius: 16, padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.75rem' }}>🤲</span>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Douce</p>
            <p style={{
              margin: 0, fontSize: '1.6rem', fontWeight: 800,
              color: '#245c2a',
            }}>
              CHF 15
              <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.6 }}> /mois</span>
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.65, lineHeight: 1.5 }}>
              Tarif solidaire — mêmes droits, même accès.
            </p>
          </div>

          {/* Don */}
          <div style={{
            background: '#fff8e6', border: '1px solid #DC7F0030',
            borderRadius: 16, padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.75rem' }}>💛</span>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Don récurrent</p>
            <p style={{
              margin: 0, fontSize: '1.1rem', fontWeight: 700,
              color: '#DC7F00',
            }}>
              Libre
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.65, lineHeight: 1.5 }}>
              {t('don')} — pour soutenir l&apos;association au-delà de la cotisation.
            </p>
          </div>
        </div>

        {/* Note charges + paiement */}
        <div style={{
          background: '#f8f9fa', borderRadius: 12, padding: '1rem 1.25rem',
          border: '1px solid #e8e8e8', fontSize: '0.88rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem',
        }}>
          <span style={{ opacity: 0.7 }}>ℹ️ {t('charges')}</span>
          <span style={{ opacity: 0.7 }}>💳 {t('payment')}</span>
        </div>
      </section>

      {/* ── Pourquoi adhérer ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>
          {t('whyTitle')}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '0.85rem',
        }}>
          {WHY_ITEMS.map(item => (
            <div
              key={item.key}
              style={{
                background: '#fff',
                border: '1px solid rgba(16,24,40,0.08)',
                borderRadius: 14,
                padding: '1.1rem 1.25rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.35rem', flexShrink: 0, marginTop: '0.05rem' }}>
                {item.emoji}
              </span>
              <div>
                <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  {t(item.titleKey)}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.65, lineHeight: 1.5 }}>
                  {t(item.textKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Je veux essayer ── */}
      <section style={{
        background: '#f8f9fa',
        borderRadius: 20,
        padding: 'clamp(1.5rem, 4vw, 2.25rem)',
        border: '1px solid #e8e8e8',
      }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>
          {t('tryTitle')}
        </h2>

        {/* Note essai gratuit */}
        <p style={{
          margin: '0 0 1.5rem',
          fontSize: '0.9rem',
          color: 'rgba(16,24,40,0.65)',
          lineHeight: 1.65,
          maxWidth: 540,
        }}>
          {t('cta_text')}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}>
          {tryCards.map((card, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid rgba(16,24,40,0.08)',
                borderRadius: 14,
                padding: '1.1rem 1.25rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#0E1726', color: '#cda867',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
              }}>
                {STEP_EMOJIS[i] ?? i + 1}
              </div>
              <div>
                <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  {card.title}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.65, lineHeight: 1.55 }}>
                  {card.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Boutons CTA : inscription directe + contact */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/inscription"
            locale={locale}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#DC7F00',
              color: '#fff',
              padding: '0.8rem 2rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.97rem',
            }}
          >
            {t('cta_button')}
          </Link>
          <Link
            href="/contact"
            locale={locale}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'transparent',
              color: '#0E1726',
              border: '2px solid #0E1726',
              padding: '0.8rem 2rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.97rem',
            }}
          >
            Nous contacter →
          </Link>
        </div>
      </section>

    </div>
  )
}
