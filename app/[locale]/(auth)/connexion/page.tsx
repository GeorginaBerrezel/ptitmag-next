'use client'

import { Suspense, use, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'
import CompteConfirmeBanner from '@/components/CompteConfirmeBanner'
import styles from '@/components/auth/auth-form.module.css'

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
  const errorId = useId()
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
    <div className={`container ${styles.page} ${styles.pageNarrow}`}>
      <h1 className={styles.title}>Connexion</h1>
      <p className={styles.intro}>Accédez à votre espace adhérent.</p>

      <Suspense fallback={null}>
        <CompteConfirmeBanner variant="connexion" />
      </Suspense>

      <form
        onSubmit={handleSubmit}
        className={styles.form}
        aria-describedby={error ? errorId : undefined}
        noValidate
      >
        {error && (
          <p id={errorId} role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="votre@email.com"
            aria-invalid={error ? true : undefined}
            className={`${styles.input} ${error ? styles.inputInvalid : ''}`}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="password" className={styles.label}>Mot de passe</label>
            <Link
              href="/mot-de-passe-oublie"
              locale={locale}
              className={styles.linkSubtle}
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
            invalid={!!error}
            describedBy={error ? errorId : undefined}
          />
        </div>

        <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className={styles.footer}>
        Pas encore de compte ?{' '}
        <Link href="/inscription" locale={locale} className={styles.link}>
          S&apos;inscrire
        </Link>
      </p>
    </div>
  )
}
