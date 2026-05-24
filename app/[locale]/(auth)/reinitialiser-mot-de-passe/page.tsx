'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'

export default function ReinitialiserMotDePassePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setCheckingSession(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Impossible de mettre à jour le mot de passe. Réessayez ou demandez un nouveau lien.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.push(`/${locale}/mon-compte` as never)
    router.refresh()
  }

  if (checkingSession) {
    return (
      <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
        <p style={{ opacity: 0.7 }}>Vérification du lien…</p>
      </main>
    )
  }

  if (!hasSession) {
    return (
      <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Lien invalide ou expiré</h1>
        <p style={{ opacity: 0.7 }}>
          Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/mot-de-passe-oublie" locale={locale}>
            Mot de passe oublié
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Nouveau mot de passe</h1>
      <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
        Choisissez un mot de passe d&apos;au moins 8 caractères.
      </p>

      {success ? (
        <p>Redirection vers votre espace…</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {error && (
            <p role="alert" style={{ color: '#c0392b', background: '#fdf2f2', padding: '0.75rem 1rem', borderRadius: 8, margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'grid', gap: '0.375rem' }}>
            <label htmlFor="password">Nouveau mot de passe</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div style={{ display: 'grid', gap: '0.375rem' }}>
            <label htmlFor="confirm">Confirmer le mot de passe</label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      )}
    </main>
  )
}
