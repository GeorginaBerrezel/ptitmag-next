import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

// ─── Données ─────────────────────────────────────────────────────────────────
// Les noms et lieux sont extraits de la liste d'origine "Nom - Lieu".
// Les emojis et descriptions sont ajoutés pour rendre la page plus vivante.

type LocalProducer = {
  name: string
  location: string
  emoji: string
  description: string
}

type Wholesaler = {
  name: string
  emoji: string
  description: string
}

const LOCAL_PRODUCERS: LocalProducer[] = [
  { name: 'La Fermette à Didi',        location: 'Icôgne',     emoji: '🥛', description: 'Produits laitiers et de la ferme, élevage traditionnel.' },
  { name: 'Bioterroir',                 location: 'Bramois',    emoji: '🥬', description: 'Légumes bio de saison cultivés en Valais central.' },
  { name: 'Les Dailles',                location: 'St-Léonard', emoji: '🌿', description: 'Productions locales variées, respect de la terre.' },
  { name: 'Domaine de la Préfecture',   location: 'Vétroz',     emoji: '🍷', description: 'Vins valaisans issus de cépages nobles du coteau.' },
  { name: 'Grégory Sermier',            location: 'Arbaz',      emoji: '🌱', description: 'Maraîchage et productions locales de qualité.' },
  { name: "Brasseries d'Ayent",         location: 'Ayent',      emoji: '🍺', description: 'Bières artisanales brassées au cœur des Alpes valaisannes.' },
  { name: 'Chèrouche',                  location: 'Ayent',      emoji: '🫙', description: 'Charcuterie et produits locaux transformés à la ferme.' },
  { name: 'Oliv et Stéph',              location: 'Itravers',   emoji: '🧀', description: 'Produits fermiers artisanaux, passion du terroir.' },
  { name: "Graines d'Avenir",           location: 'Montana',    emoji: '🌾', description: 'Graines, céréales et légumineuses cultivées en bio.' },
  { name: 'La Cave à levain',           location: 'Champlan',   emoji: '🍞', description: 'Pains au levain naturel, farines bio locales.' },
  { name: 'Vérène Melchior',            location: 'Savièse',    emoji: '🌺', description: 'Plantes aromatiques et médicinales du plateau de Savièse.' },
  { name: 'Evoleina Rhodiola',          location: 'Evolène',    emoji: '🌿', description: 'Rhodiola et plantes adaptogènes cultivées en altitude.' },
]

const WHOLESALERS: Wholesaler[] = [
  { name: 'Biopartner',          emoji: '🏭', description: 'Grossiste bio de référence en Suisse' },
  { name: 'Aromacos',            emoji: '🌸', description: 'Cosmétiques & huiles essentielles' },
  { name: 'Bio-pass',            emoji: '🛒', description: 'Épicerie bio généraliste' },
  { name: 'Novoma',              emoji: '💊', description: 'Compléments alimentaires naturels' },
  { name: 'Kingnature',          emoji: '🌿', description: 'Compléments & extraits naturels' },
  { name: 'Groen Labo',          emoji: '🔬', description: 'Produits issus du laboratoire nature' },
  { name: 'Phytolis',            emoji: '🌱', description: 'Phytothérapie & plantes médicinales' },
  { name: 'Laboratoires LRK',    emoji: '⚗️', description: 'Formules naturelles certifiées' },
  { name: 'Algorigin',           emoji: '🌊', description: 'Algues, spiruline & superaliments' },
]

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
      <div style={{
        background: 'linear-gradient(135deg, #0E1726 0%, #1a3020 100%)',
        borderRadius: 20,
        padding: 'clamp(1.75rem, 5vw, 2.75rem)',
        color: '#fff',
        marginBottom: '3rem',
      }}>
        <p style={{
          margin: '0 0 0.5rem',
          fontSize: '0.78rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#cda867',
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
            <div
              key={producer.name}
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
              {/* En-tête de la carte */}
              <div style={{
                background: 'linear-gradient(135deg, #f0f7f0, #e8f5e9)',
                padding: '1.25rem 1.25rem 1rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#fff',
                  fontSize: '1.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  {producer.emoji}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {producer.name}
                  </h3>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.76rem', color: '#245c2a', fontWeight: 600,
                    background: '#fff', borderRadius: 999,
                    padding: '0.1rem 0.5rem',
                    border: '1px solid #c8e6c9',
                  }}>
                    📍 {producer.location}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '0.85rem 1.25rem 1.25rem', flexGrow: 1 }}>
                <p style={{
                  margin: 0, fontSize: '0.84rem',
                  color: 'rgba(16,24,40,0.65)', lineHeight: 1.55,
                }}>
                  {producer.description}
                </p>
              </div>
            </div>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '0.75rem',
        }}>
          {WHOLESALERS.map(supplier => (
            <div
              key={supplier.name}
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
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{supplier.emoji}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{supplier.name}</p>
                <p style={{ margin: 0, fontSize: '0.77rem', opacity: 0.55, marginTop: '0.1rem' }}>
                  {supplier.description}
                </p>
              </div>
            </div>
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
