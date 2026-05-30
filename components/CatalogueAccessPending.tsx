'use client'

import { Link } from '@/i18n/navigation'
import { site } from '@/lib/site'
import type { Profile } from '@/lib/supabase/auth'

type Props = {
  locale?: string
  profile?: Pick<Profile, 'email' | 'phone'> | null
}

export default function CatalogueAccessPending({ locale = 'fr', profile }: Props) {
  const phoneDisplay = site.telephone.replace('+41', '0').replace(/(\d{2})(?=\d)/g, '$1 ')

  return (
    <main className="container" style={{ maxWidth: 560, paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div style={{
        background: '#fff',
        border: '1px solid rgba(16,24,40,0.08)',
        borderRadius: 16,
        padding: 'clamp(1.5rem, 4vw, 2rem)',
      }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '1.75rem' }} aria-hidden>⏳</p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.35rem' }}>
          Accès catalogue en attente
        </h1>
        <p style={{ margin: '0 0 1rem', lineHeight: 1.65, opacity: 0.8 }}>
          Votre compte est en attente de validation. Joel validera votre adhésion
          (statut <strong>Ciel</strong> ou <strong>Terre</strong>) avant l&apos;accès
          au catalogue et aux prix.
        </p>
        <p style={{ margin: '0 0 1.25rem', lineHeight: 1.65, opacity: 0.8 }}>
          Joel peut vous contacter via les coordonnées indiquées à l&apos;inscription
          {profile?.phone ? <> (téléphone ou e-mail)</> : <> (e-mail{profile?.email ? ` : ${profile.email}` : ''})</>}.
          Vous pouvez aussi le joindre directement :
        </p>

        <ul style={{ margin: '0 0 1.5rem', paddingLeft: '1.2rem', lineHeight: 1.8, opacity: 0.85 }}>
          <li>
            <a href={`mailto:${site.email}`} style={{ color: '#1565c0' }}>{site.email}</a>
          </li>
          <li>
            <a href={`tel:${site.telephone}`} style={{ color: '#1565c0' }}>{phoneDisplay.trim()}</a>
          </li>
        </ul>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link
            href="/mon-compte"
            locale={locale as 'fr' | 'en'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#0E1726',
              color: '#fff',
              padding: '0.55rem 1.15rem',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Mon compte
          </Link>
          <Link
            href="/contact"
            locale={locale as 'fr' | 'en'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '2px solid #0E1726',
              color: '#0E1726',
              padding: '0.55rem 1.15rem',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </main>
  )
}
