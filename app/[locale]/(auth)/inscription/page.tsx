'use client'

import { use, useState } from 'react'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'
import { emailConfirmationSiteHint } from '@/lib/auth/confirmation-hint'

const fieldStyle = { display: 'grid' as const, gap: '0.375rem' }

export default function InscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [commune, setCommune] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        postalCode,
        commune,
        phone: phone || undefined,
        password,
        locale,
        siteOrigin: window.location.origin,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue. Réessayez.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    const siteHint =
      typeof window !== 'undefined'
        ? emailConfirmationSiteHint(window.location.hostname)
        : 'sur le site où vous vous êtes inscrit·e.'

    return (
      <main className="container" style={{ maxWidth: 480, paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Vérifiez votre e-mail</h1>
        <p>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.
          Cliquez dessus pour activer votre compte.
        </p>
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem 1.15rem',
          background: '#f0f7ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          fontSize: '0.92rem',
          lineHeight: 1.6,
          color: '#1e3a5f',
        }}>
          <strong>Prochaine étape :</strong> votre compte sera en statut «&nbsp;Non membre&nbsp;» jusqu&apos;à
          validation par Joel. Vous recevrez un <strong>e-mail</strong> dès que votre adhésion sera validée
          (statut Ciel ou Terre). Il pourra aussi vous contacter via le téléphone ou l&apos;e-mail indiqués
          si besoin — vous pouvez aussi le joindre depuis la page Contact.
        </div>
        <p style={{ opacity: 0.7, marginTop: '1rem', fontSize: '0.9rem' }}>
          Vous pouvez fermer cette page. Le lien est valable 24 heures.
          Ouvrez le lien <strong>{siteHint}</strong>
        </p>
      </main>
    )
  }

  return (
    <main className="container" style={{ maxWidth: 480, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Créer un compte</h1>
      <p style={{ marginBottom: '1.75rem', opacity: 0.7, lineHeight: 1.55 }}>
        Inscription gratuite. L&apos;accès au catalogue sera activé par Joel après validation
        de votre adhésion.{' '}
        <Link href="/membership" locale={locale as 'fr' | 'en'} style={{ color: '#1565c0', fontWeight: 600 }}>
          Comprendre les statuts Ciel et Terre →
        </Link>
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {error && (
          <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
        }}>
          <div style={fieldStyle}>
            <label htmlFor="firstName">Prénom</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder="Joël"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="lastName">Nom</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              placeholder="Dupont"
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="votre@email.com"
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(88px, 110px) 1fr',
          gap: '0.75rem',
        }}>
          <div style={fieldStyle}>
            <label htmlFor="postalCode">NPA</label>
            <input
              id="postalCode"
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={postalCode}
              onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
              autoComplete="postal-code"
              placeholder="1966"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="commune">Commune</label>
            <input
              id="commune"
              type="text"
              value={commune}
              onChange={e => setCommune(e.target.value)}
              required
              autoComplete="address-level2"
              placeholder="St-Romain (Ayent)"
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="phone">
            Téléphone{' '}
            <span style={{ opacity: 0.55, fontWeight: 400 }}>(facultatif)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="079 123 45 67"
          />
          <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6, lineHeight: 1.45 }}>
            Pour que Joel puisse vous joindre pendant la validation de votre adhésion.
          </p>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="password">
            Mot de passe{' '}
            <span style={{ opacity: 0.6, fontWeight: 400 }}>(8 caractères min.)</span>
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', opacity: 0.7 }}>
        Déjà un compte ?{' '}
        <Link href="/connexion" locale={locale}>
          Se connecter
        </Link>
      </p>
    </main>
  )
}
