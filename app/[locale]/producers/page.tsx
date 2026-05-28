import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import ProducerCard from '@/components/ProducerCard'
import WholesalerCard from '@/components/WholesalerCard'
import { LOCAL_PRODUCERS } from '@/lib/catalog/local-producers'
import { WHOLESALERS } from '@/lib/catalog/wholesalers'

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'producers' })
  return {
    title: t('seoTitle'),
    description: t('seoDescription'),
  }
}

export default async function ProducersPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'producers' })

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

      {/* ── Bloc intro ── */}
      <div className="page-hero" style={{
        background: 'linear-gradient(135deg, #0E1726 0%, #1a3020 100%)',
        borderRadius: 20,
        padding: 'clamp(1.75rem, 5vw, 2.75rem)',
        color: '#fff',
        marginBottom: '3rem',
      }}>
        <p className="page-hero-kicker" style={{
          margin: '0 0 0.5rem',
          fontSize: '0.78rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 700,
          opacity: 0.9,
        }}>
          Le p&apos;tit mag · St-Romain (Ayent)
        </p>
        <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800 }}>
          {t('title')}
        </h1>
        <p style={{ margin: 0, opacity: 0.8, maxWidth: 560, lineHeight: 1.65, fontSize: '1rem' }}>
          {t('intro')}
        </p>
      </div>

      {/* ── Producteurs locaux ── */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>{t('local_title')}</h2>
          <span style={{
            background: '#e8f5e9', color: '#2e7d32',
            borderRadius: 999, padding: '0.15rem 0.65rem',
            fontSize: '0.78rem', fontWeight: 700,
          }}>
            {LOCAL_PRODUCERS.length}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {LOCAL_PRODUCERS.map(producer => (
            <ProducerCard key={producer.slug} producer={producer} />
          ))}
        </div>
      </section>

      {/* ── Grossistes bio ── */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>{t('wholesale_title')}</h2>
          <span style={{
            background: '#e3f2fd', color: '#1565c0',
            borderRadius: 999, padding: '0.15rem 0.65rem',
            fontSize: '0.78rem', fontWeight: 700,
          }}>
            {WHOLESALERS.length}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {WHOLESALERS.map(wholesaler => (
            <WholesalerCard key={wholesaler.slug} wholesaler={wholesaler} />
          ))}
        </div>
      </section>

      {/* ── Comment proposer vos produits ── */}
      <section style={{
        background: '#f8f9fa',
        borderRadius: 20,
        padding: 'clamp(1.5rem, 4vw, 2.25rem)',
        border: '1px solid #e8e8e8',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ margin: '0 0 1.5rem' }}>{t('howTitle')}</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {([t('how1'), t('how2'), t('how3')] as string[]).map((step, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '1.1rem 1.25rem',
                border: '1px solid rgba(16,24,40,0.07)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#0E1726', color: '#cda867',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                marginTop: '0.05rem',
              }}>
                {i + 1}
              </span>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'rgba(16,24,40,0.75)' }}>
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* CTA contact */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/contact"
            locale={locale}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0E1726',
              color: '#fff',
              padding: '0.7rem 1.75rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.01em',
            }}
          >
            Nous contacter →
          </Link>
        </div>
      </section>

    </div>
  )
}
