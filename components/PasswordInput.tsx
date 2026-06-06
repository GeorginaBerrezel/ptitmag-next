'use client'

import { useId, useState } from 'react'
import PasswordCriteria from '@/components/auth/PasswordCriteria'
import styles from '@/components/auth/password-input.module.css'

type Props = {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  minLength?: number
  required?: boolean
  /** Inscription / réinitialisation : critères visibles pendant la saisie. */
  showCriteria?: boolean
  confirmValue?: string
  invalid?: boolean
  describedBy?: string
}

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  minLength,
  required,
  showCriteria = false,
  confirmValue,
  invalid = false,
  describedBy,
}: Props) {
  const [visible, setVisible] = useState(false)
  const criteriaId = useId()
  const ariaDescribedBy = [
    describedBy,
    showCriteria ? criteriaId : undefined,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        enterKeyHint={autoComplete === 'new-password' ? 'next' : 'done'}
        className={`${styles.input} ${invalid ? styles.inputInvalid : ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className={styles.toggle}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
      >
        {visible ? 'Masquer' : 'Afficher'}
      </button>
      {showCriteria && (
        <PasswordCriteria
          id={criteriaId}
          password={value}
          confirm={confirmValue}
        />
      )}
    </div>
  )
}
