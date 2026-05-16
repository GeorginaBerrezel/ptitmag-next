import { getTranslations } from 'next-intl/server'
import { site } from '@/lib/site'
import ContactForm from '@/components/ContactForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi',
  Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche',
}

// "09:00-12:00" → "9h–12h"
function formatRange(range: string) {
  return range
    .replace(/(\d+):00/g, '$1h')
    .replace(':30', 'h30')
    .replace('-', '–')
}

// "+41788664243" → "078 866 42 43"
function formatPhone(e164: string) {
  const digits = e164.replace('+41', '0').replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')
}

// ─── Métadonnées SEO ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: t('seoTitle'), description: t('seoDescription') }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })

  const displayPhone = formatPhone(site.telephone)

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

      {/* ── Bloc intro ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0E1726 0%, #1a2e3a 100%)',
        borderRadius: 20,
        padding: 'clamp(1.75rem, 5vw, 2.75rem)',
        color: '#fff',
        marginBottom: '2rem',
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
        <h1 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800 }}>
          {t('title')}
        </h1>
        <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.65 }}>
          {t('intro')}
        </p>
      </div>

      {/* ── Grille principale ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>

        {/* Carte téléphone + email */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 16,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nous joindre
          </h2>

          {/* Téléphone — grand, orange, toutes les couleurs forcées pour dark mode */}
          <a
            href={`tel:${site.telephone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: '#DC7F00',
              color: '#fff',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>📞</span>
            <div>
              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.02em', color: '#fff' }}>
                {displayPhone}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.1rem' }}>
                Joël — appeler ou SMS
              </p>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${site.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: '#f8f9fa',
              color: '#0E1726',
              borderRadius: 12,
              padding: '0.85rem 1.1rem',
              textDecoration: 'none',
              border: '1px solid rgba(16,24,40,0.08)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>✉️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                {site.email}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5, marginTop: '0.1rem' }}>
                Réponse sous 48h
              </p>
            </div>
          </a>

          {/* WhatsApp */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', opacity: 0.55 }}>
              Vous préférez WhatsApp ?
            </p>
            <ContactForm />
          </div>
        </div>

        {/* Carte adresse + horaires */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 16,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}>
          {/* Adresse */}
          <div>
            <h2 style={{ margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adresse
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{site.address.streetAddress}</p>
                <p style={{ margin: 0, opacity: 0.65 }}>
                  {site.address.postalCode} {site.address.addressLocality}
                </p>
                <p style={{ margin: 0, opacity: 0.65 }}>Suisse</p>
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Horaires d&apos;ouverture
            </h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {site.openingHours.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8f9fa',
                    borderRadius: 8,
                    padding: '0.5rem 0.85rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {slot.days.map(d => DAY_LABELS[d] ?? d).join(', ')}
                  </span>
                  <span style={{ opacity: 0.65, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {slot.ranges.map(formatRange).join('  ·  ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signal */}
          <div style={{
            background: '#e8f5e9',
            borderRadius: 12,
            padding: '0.85rem 1rem',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💬</span>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#245c2a', lineHeight: 1.55 }}>
              {t('signal_info')}
            </p>
          </div>
        </div>

      </div>

      {/* ── Venir nous rendre visite ── */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: 16,
        padding: '1.5rem',
        border: '1px solid #e8e8e8',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>
            Passez nous voir au local !
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.65, lineHeight: 1.55 }}>
            Le magasin associatif est ouvert aux horaires ci-dessus.
            Venez découvrir le fonctionnement en direct, autour d&apos;un café ou d&apos;une bière.
          </p>
        </div>
        {site.googleMapsLink ? (
          <a
            href={site.googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0E1726',
              color: '#fff',
              padding: '0.65rem 1.25rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            🗺️ Itinéraire
          </a>
        ) : (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(site.address.full)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0E1726',
              color: '#fff',
              padding: '0.65rem 1.25rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            🗺️ Voir sur Maps
          </a>
        )}
      </div>

    </div>
  )
}
