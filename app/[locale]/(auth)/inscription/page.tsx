'use client'

import { use, useId, useState } from 'react'
import PasswordInput from '@/components/PasswordInput'
import { Link } from '@/i18n/navigation'
import { emailConfirmationSiteHint } from '@/lib/auth/confirmation-hint'
import { isPasswordValid } from '@/lib/auth/password-rules'
import styles from '@/components/auth/auth-form.module.css'

export default function InscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const errorId = useId()
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

  const passwordOk = isPasswordValid(password)
  const canSubmit = passwordOk && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordOk) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

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
      <div className={`container ${styles.page}`}>
        <h1 className={styles.title}>Vérifiez votre e-mail</h1>
        <p className={styles.intro}>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.
          Cliquez dessus pour activer votre compte.
        </p>
        <div className={styles.infoBox}>
          <strong>Prochaine étape :</strong> votre compte sera en statut «&nbsp;Non membre&nbsp;» jusqu&apos;à
          validation par Joel. Vous recevrez un <strong>e-mail</strong> dès que votre adhésion sera validée
          (statut Ciel ou Terre). Il pourra aussi vous contacter via le téléphone ou l&apos;e-mail indiqués
          si besoin — vous pouvez aussi le joindre depuis la page Contact.
        </div>
        <p className={styles.hint} style={{ marginTop: '1rem' }}>
          Vous pouvez fermer cette page. Le lien est valable 24 heures.
          Ouvrez le lien <strong>{siteHint}</strong>
        </p>
      </div>
    )
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Créer un compte</h1>
      <p className={styles.intro}>
        Inscription gratuite. L&apos;accès au catalogue sera activé par Joel après validation
        de votre adhésion.{' '}
        <Link href="/membership" locale={locale as 'fr' | 'en'} className={styles.link}>
          Comprendre les statuts Ciel et Terre →
        </Link>
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

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="firstName" className={styles.label}>Prénom</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Joël"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="lastName" className={styles.label}>Nom</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Dupont"
              className={styles.input}
            />
          </div>
        </div>

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
            className={styles.input}
          />
        </div>

        <div className={styles.fieldRowNpa}>
          <div className={styles.field}>
            <label htmlFor="postalCode" className={styles.label}>NPA</label>
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
              enterKeyHint="next"
              placeholder="1966"
              aria-describedby="postalCode-hint"
              className={styles.input}
            />
            <p id="postalCode-hint" className={styles.hint}>4 chiffres</p>
          </div>
          <div className={styles.field}>
            <label htmlFor="commune" className={styles.label}>Commune</label>
            <input
              id="commune"
              type="text"
              value={commune}
              onChange={e => setCommune(e.target.value)}
              required
              autoComplete="address-level2"
              enterKeyHint="next"
              placeholder="St-Romain (Ayent)"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="phone" className={styles.label}>
            Téléphone{' '}
            <span className={styles.labelOptional}>(facultatif)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="079 123 45 67"
            aria-describedby="phone-hint"
            className={styles.input}
          />
          <p id="phone-hint" className={styles.hint}>
            Pour que Joel puisse vous joindre pendant la validation de votre adhésion.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Mot de passe
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            required
            showCriteria
            invalid={password.length > 0 && !passwordOk}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`btn btn-primary ${styles.submitBtn}`}
          aria-disabled={!canSubmit}
        >
          {loading ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>

      <p className={styles.footer}>
        Déjà un compte ?{' '}
        <Link href="/connexion" locale={locale} className={styles.link}>
          Se connecter
        </Link>
      </p>
    </div>
  )
}
