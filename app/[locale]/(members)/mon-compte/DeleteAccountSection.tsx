'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CONFIRMATION = 'SUPPRIMER'

export default function DeleteAccountSection({ locale }: { locale: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = confirmation.trim() === CONFIRMATION

  async function handleDelete() {
    if (!canDelete || loading) return

    setLoading(true)
    setError(null)

    const res = await fetch('/api/profile/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ confirmation: confirmation.trim() }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'La suppression a échoué. Réessaie ou contacte-nous.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  return (
    <section
      aria-label="Suppression de compte"
      style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: 14,
        border: '1px solid #f5c6c6',
        background: '#fffafa',
      }}
    >
      <h2 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: '#c0392b' }}>
        Zone sensible
      </h2>
      <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.55 }}>
        La suppression de votre compte est définitive. Vos commandes passées restent visibles
        pour l&apos;association, mais vos données personnelles seront effacées.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 8,
            border: '1px solid #e57373',
            background: '#fff',
            color: '#c0392b',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Supprimer mon compte
        </button>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <p style={{ margin: 0, fontSize: '0.83rem', color: '#c0392b', fontWeight: 600 }}>
            Pour confirmer, tape <strong>{CONFIRMATION}</strong> ci-dessous :
          </p>
          <input
            type="text"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder={CONFIRMATION}
            autoComplete="off"
            disabled={loading}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 8,
              border: '1px solid #e57373',
              fontSize: '0.875rem',
              maxWidth: 220,
            }}
          />
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: '0.83rem', color: '#c0392b' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || loading}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: canDelete && !loading ? '#c0392b' : '#e0e0e0',
                color: canDelete && !loading ? '#fff' : '#888',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: canDelete && !loading ? 'pointer' : 'default',
              }}
            >
              {loading ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmation(''); setError(null) }}
              disabled={loading}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#fff',
                fontSize: '0.85rem',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
