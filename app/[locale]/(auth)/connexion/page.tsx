'use client'

import { Suspense, use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'
import CompteConfirmeBanner from '@/components/CompteConfirmeBanner'

export default function ConnexionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { locale } = use(params)
  const { error: errorParam, next } = use(searchParams)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'lien_invalide'
      ? 'Ce lien a déjà été utilisé ou a expiré. Essayez de vous connecter avec votre e-mail et votre mot de passe : votre compte est peut-être déjà actif.'
      : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push((next ?? `/${locale}/mon-compte`) as never)
    router.refresh()
  }

  return (
    <main className="container" style={{ maxWidth: 440, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Connexion</h1>
      <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
        Accédez à votre espace adhérent.
      </p>

      <Suspense fallback={null}>
        <CompteConfirmeBanner variant="connexion" />
      </Suspense>

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

        <div style={{ display: 'grid', gap: '0.375rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
            <label htmlFor="password">Mot de passe</label>
            <Link
              href="/mot-de-passe-oublie"
              locale={locale}
              style={{ fontSize: '0.85rem', opacity: 0.75 }}
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', opacity: 0.7 }}>
        Pas encore de compte ?{' '}
        <Link href="/inscription" locale={locale}>
          S&apos;inscrire
        </Link>
      </p>
    </main>
  )
}
