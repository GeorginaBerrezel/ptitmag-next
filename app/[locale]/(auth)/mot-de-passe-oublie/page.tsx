'use client'

import { use, useId, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authCallbackUrl } from '@/lib/auth/urls'
import { Link } from '@/i18n/navigation'
import styles from '@/components/auth/auth-form.module.css'

export default function MotDePasseOubliePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const errorId = useId()
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
      <div className={`container ${styles.page} ${styles.pageNarrow}`}>
        <h1 className={styles.title}>E-mail envoyé</h1>
        <p className={styles.intro}>
          Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien
          pour choisir un nouveau mot de passe.
        </p>
        <p className={styles.hint} style={{ marginTop: '1rem' }}>
          Pensez à vérifier vos spams. Le lien est valable 24 heures.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/connexion" locale={locale} className={styles.link}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={`container ${styles.page} ${styles.pageNarrow}`}>
      <h1 className={styles.title}>Mot de passe oublié</h1>
      <p className={styles.intro}>
        Entrez votre e-mail : nous vous enverrons un lien pour définir un nouveau mot de passe.
      </p>

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
            enterKeyHint="send"
            placeholder="votre@email.com"
            aria-invalid={error ? true : undefined}
            className={`${styles.input} ${error ? styles.inputInvalid : ''}`}
          />
        </div>

        <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <p className={styles.footer}>
        <Link href="/connexion" locale={locale} className={styles.link}>
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
