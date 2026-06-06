'use client'

import { getPasswordCriteria, passwordsMatch } from '@/lib/auth/password-rules'
import styles from './auth-form.module.css'

type Props = {
  password: string
  confirm?: string
  id?: string
}

export default function PasswordCriteria({ password, confirm, id = 'password-criteria' }: Props) {
  const criteria = getPasswordCriteria(password)
  const showMatch = confirm !== undefined

  return (
    <ul id={id} className={styles.criteria} aria-live="polite">
      {criteria.map(c => (
        <li
          key={c.id}
          className={`${styles.criterion} ${c.met ? styles.criterionMet : ''}`}
        >
          <span className={styles.criterionIcon} aria-hidden="true">
            {c.met ? '✓' : '○'}
          </span>
          <span>{c.label}</span>
        </li>
      ))}
      {showMatch && (
        <li
          className={`${styles.criterion} ${passwordsMatch(password, confirm ?? '') ? styles.criterionMet : ''}`}
        >
          <span className={styles.criterionIcon} aria-hidden="true">
            {passwordsMatch(password, confirm ?? '') ? '✓' : '○'}
          </span>
          <span>Les deux mots de passe sont identiques</span>
        </li>
      )}
    </ul>
  )
}
