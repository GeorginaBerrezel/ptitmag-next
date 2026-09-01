'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LocalityCombobox from '@/components/locality/LocalityCombobox'
import { formatLocalityLabel } from '@/lib/localities/normalize'
import type { Profile } from '@/lib/supabase/auth'
import { InlineStatus } from '@/components/ui/InlineStatus'
import styles from './profile-location.module.css'

type Props = {
  profile: Profile | null
}

export default function ProfileLocationSection({ profile }: Props) {
  const router = useRouter()
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? '')
  const [commune, setCommune] = useState(profile?.commune ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [touched, setTouched] = useState(false)

  const savedPostal = profile?.postal_code ?? ''
  const savedCommune = profile?.commune ?? ''
  const hasSavedLocation = Boolean(savedPostal && savedCommune)
  const hasPendingChanges =
    postalCode.trim() !== savedPostal.trim() || commune.trim() !== savedCommune.trim()
  const selectionOk = Boolean(postalCode && commune)

  useEffect(() => {
    if (!editing) {
      setPostalCode(savedPostal)
      setCommune(savedCommune)
    }
  }, [savedPostal, savedCommune, editing])

  async function handleSave() {
    if (!selectionOk) {
      setTouched(true)
      setError('Sélectionnez votre localité dans la liste.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('postal_code', postalCode.trim())
    formData.append('commune', commune.trim())

    const res = await fetch('/api/profile/update', { method: 'POST', body: formData })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la sauvegarde.')
      return
    }

    setEditing(false)
    setSuccess(true)
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  function handleCancel() {
    setPostalCode(savedPostal)
    setCommune(savedCommune)
    setEditing(false)
    setTouched(false)
    setError(null)
  }

  return (
    <section className={styles.card} aria-label="Localité" aria-busy={saving}>
      <div className={styles.header}>
        <h2 className={styles.title}>Localité</h2>
        {!editing && (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setEditing(true)}
            disabled={saving}
            aria-label="Modifier ma localité"
          >
            ✎ Modifier
          </button>
        )}
      </div>

      {!editing ? (
        <p className={styles.display}>
          {hasSavedLocation
            ? formatLocalityLabel({ postalCode: savedPostal, commune: savedCommune })
            : 'Non renseignée. Ajoutez votre NPA et village pour faciliter le suivi par Joel.'}
        </p>
      ) : (
        <LocalityCombobox
          postalCode={postalCode}
          commune={commune}
          onChange={selection => {
            setTouched(true)
            setPostalCode(selection?.postalCode ?? '')
            setCommune(selection?.commune ?? '')
          }}
          disabled={saving}
          invalid={touched && !selectionOk}
          hint="Utile si vous déménagez ou si votre localité a été mal saisie à l'inscription."
        />
      )}

      {editing && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !hasPendingChanges}
            className={styles.saveBtn}
            aria-busy={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Annuler
          </button>
        </div>
      )}

      {saving && <InlineStatus message="Enregistrement de la localité…" live="assertive" />}
      {error && !saving && <p role="alert" className={styles.error}>{error}</p>}
      {success && <p role="status" className={styles.success}>✓ Localité mise à jour !</p>}
    </section>
  )
}
