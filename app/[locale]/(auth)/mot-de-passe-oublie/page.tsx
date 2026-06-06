'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authCallbackUrl } from '@/lib/auth/urls'
import { Link } from '@/i18n/navigation'

export default function MotDePasseOubliePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(`/${locale}/reinitialiser-mot-de-passe`, window.location.origin),
    })

    if (error) {
      setError('Impossible d\'envoyer l\'e-mail. Vérifiez l\'adresse et réessayez.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>E-mail envoyé</h1>
        <p>
          Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien
          pour choisir un nouveau mot de passe.
        </p>
        <p style={{ opacity: 0.7, marginTop: '1rem', fontSize: '0.9rem' }}>
          Pensez à vérifier vos spams. Le lien est valable 24 heures.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/connexion" locale={locale}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Mot de passe oublié</h1>
      <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
        Entrez votre e-mail : nous vous enverrons un lien pour définir un nouveau mot de passe.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {error && (
          <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'grid', gap: '0.375rem' }}>
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

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', opacity: 0.7 }}>
        <Link href="/connexion" locale={locale}>
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
