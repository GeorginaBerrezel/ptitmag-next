'use client'

import { useState } from 'react'

type Props = {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  minLength?: number
  required?: boolean
}

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  minLength,
  required,
}: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        style={{ width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem 0.4rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'rgba(16,24,40,0.55)',
          lineHeight: 1,
        }}
      >
        {visible ? 'Masquer' : 'Afficher'}
      </button>
    </div>
  )
}
