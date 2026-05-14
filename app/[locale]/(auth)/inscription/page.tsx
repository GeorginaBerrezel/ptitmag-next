'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'

export default function InscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError("Une erreur est survenue. Vérifiez vos informations et réessayez.")
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Vérifiez votre e-mail</h1>
        <p>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.
          Cliquez sur ce lien pour activer votre compte et accéder à votre espace adhérent.
        </p>
        <p style={{ opacity: 0.7, marginTop: '1rem', fontSize: '0.9rem' }}>
          Vous pouvez fermer cette page. Le lien est valable 24 heures.
        </p>
      </main>
    )
  }

  return (
    <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Créer un compte</h1>
      <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
        Période d&apos;essai de 3 mois — aucun engagement immédiat.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {error && (
          <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'grid', gap: '0.375rem' }}>
          <label htmlFor="fullName">Nom complet</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Joël Dupont"
          />
        </div>

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

        <div style={{ display: 'grid', gap: '0.375rem' }}>
          <label htmlFor="password">Mot de passe <span style={{ opacity: 0.6, fontWeight: 400 }}>(8 caractères min.)</span></label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
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
