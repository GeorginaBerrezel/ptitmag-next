'use client'

import { use, useId, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'
import { isPasswordValid, passwordsMatch } from '@/lib/auth/password-rules'
import styles from '@/components/auth/auth-form.module.css'

export default function ReinitialiserMotDePassePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const errorId = useId()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordOk = isPasswordValid(password)
  const matchOk = passwordsMatch(password, confirm)
  const canSubmit = passwordOk && matchOk && !loading

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

    if (!passwordOk) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (!matchOk) {
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
      <div className={`container ${styles.page} ${styles.pageNarrow}`}>
        <p className={styles.intro}>Vérification du lien…</p>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className={`container ${styles.page} ${styles.pageNarrow}`}>
        <h1 className={styles.title}>Lien invalide ou expiré</h1>
        <p className={styles.intro}>
          Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/mot-de-passe-oublie" locale={locale} className={styles.link}>
            Mot de passe oublié
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={`container ${styles.page} ${styles.pageNarrow}`}>
      <h1 className={styles.title}>Nouveau mot de passe</h1>
      <p className={styles.intro}>
        Choisissez un mot de passe d&apos;au moins 8 caractères.
      </p>

      {success ? (
        <p className={styles.intro}>Redirection vers votre espace…</p>
      ) : (
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
            <label htmlFor="password" className={styles.label}>Nouveau mot de passe</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={8}
              required
              showCriteria
              confirmValue={confirm}
              invalid={password.length > 0 && !passwordOk}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm" className={styles.label}>Confirmer le mot de passe</label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={8}
              required
              invalid={confirm.length > 0 && !matchOk}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn btn-primary ${styles.submitBtn}`}
            aria-disabled={!canSubmit}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      )}
    </div>
  )
}
