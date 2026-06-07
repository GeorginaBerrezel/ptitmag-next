'use client'

import { useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import type { Profile } from '@/lib/supabase/auth'
import {
  AVATAR_MAX_MB,
  avatarTooLargeMessage,
  isAvatarFileTooLarge,
} from '@/lib/profile/avatar-upload'
import { InlineStatus, LoadingOverlay } from '@/components/ui/InlineStatus'
import styles from './profile-header.module.css'

export default function ProfileHeader({ profile }: { profile: Profile | null }) {
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  const displayName = profile?.username ?? profile?.full_name?.split(' ')[0] ?? 'Adhérent·e'
  const shownAvatar = removeAvatar ? null : (previewUrl ?? avatarUrl)
  const hasPhoto = Boolean(avatarUrl || previewUrl)
  const hasPendingChanges =
    removeAvatar ||
    pendingFile != null ||
    username.trim() !== (profile?.username ?? '')

  const savingMessage = (() => {
    if (removeAvatar) return 'Suppression de la photo…'
    if (pendingFile) return 'Envoi de la photo…'
    return 'Enregistrement…'
  })()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (isAvatarFileTooLarge(file.size)) {
      setError(avatarTooLargeMessage(file.size))
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRemoveAvatar(false)
    setEditing(true)
    setError(null)
  }

  function handleRemovePhoto() {
    setPendingFile(null)
    setPreviewUrl(null)
    setRemoveAvatar(true)
    setEditing(true)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    if (username.trim() !== (profile?.username ?? '')) {
      formData.append('username', username.trim())
    }
    if (removeAvatar) {
      formData.append('remove_avatar', 'true')
    } else if (pendingFile) {
      formData.append('avatar', pendingFile)
    }

    if (!formData.has('username') && !formData.has('avatar') && !formData.has('remove_avatar')) {
      setEditing(false)
      setSaving(false)
      return
    }

    const res = await fetch('/api/profile/update', { method: 'POST', body: formData })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la sauvegarde.')
      return
    }

    if (removeAvatar || data.updates?.avatar_url === null) {
      setAvatarUrl(null)
    } else if (data.updates?.avatar_url) {
      setAvatarUrl(data.updates.avatar_url)
    }

    setPendingFile(null)
    setPreviewUrl(null)
    setRemoveAvatar(false)
    setEditing(false)
    setSuccess(true)
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => setSuccess(false), 3000)
  }

  function handleCancel() {
    setUsername(profile?.username ?? '')
    setPendingFile(null)
    setPreviewUrl(null)
    setRemoveAvatar(false)
    setEditing(false)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section
      className={styles.card}
      aria-label="Profil"
      aria-busy={saving}
    >
      <div className={styles.avatarWrap}>
        <label
          htmlFor="profile-avatar-input"
          className={`${styles.avatarPicker} ${saving ? styles.avatarPickerDisabled : ''}`}
        >
          <Avatar
            src={shownAvatar}
            name={profile?.full_name ?? profile?.username}
            email={profile?.email}
            userId={profile?.id}
            size={80}
            editable={!saving}
            editLabel="Changer"
          />
          {!saving && (
            <span className={styles.editPhotoBadge} aria-hidden>
              ✎
            </span>
          )}
          {saving && <LoadingOverlay message={savingMessage} live="assertive" />}
          <span className="sr-only">
            Choisir une photo de profil — JPEG, PNG ou WebP, maximum {AVATAR_MAX_MB} Mo
          </span>
        </label>
        <input
          ref={fileRef}
          id="profile-avatar-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className={styles.hiddenFileInput}
          onChange={handleFileChange}
          disabled={saving}
        />
      </div>

      <div className={styles.photoActions}>
        <label
          htmlFor="profile-avatar-input"
          className={`${styles.changePhotoLink} ${saving ? styles.actionDisabled : ''}`}
          aria-disabled={saving}
        >
          Changer la photo
        </label>
        {hasPhoto && !removeAvatar && (
          <>
            <span className={styles.photoActionsSep} aria-hidden>·</span>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className={styles.removePhotoBtn}
              disabled={saving}
            >
              Supprimer la photo
            </button>
          </>
        )}
        {removeAvatar && (
          <p className={styles.removePending} role="status">
            Photo retirée — cliquez sur Enregistrer pour confirmer.
          </p>
        )}
      </div>

      {editing ? (
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Votre pseudo…"
          maxLength={30}
          autoFocus={!pendingFile && !removeAvatar}
          className={styles.usernameInput}
          aria-label="Pseudo affiché sur le site"
          disabled={saving}
        />
      ) : (
        <div className={styles.nameRow}>
          <span className={styles.displayName}>{displayName}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={styles.editNameBtn}
            aria-label="Modifier mon pseudo"
            disabled={saving}
          >
            ✎
          </button>
        </div>
      )}

      {profile?.full_name && profile.username && (
        <p className={styles.fullName}>{profile.full_name}</p>
      )}

      {(editing || hasPendingChanges) && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !hasPendingChanges}
            className={styles.saveBtn}
            aria-busy={saving}
          >
            {saving ? savingMessage : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelBtn}
            disabled={saving}
          >
            Annuler
          </button>
        </div>
      )}

      {saving && (
        <InlineStatus message={savingMessage} live="assertive" className={styles.savingStatus} />
      )}

      {error && !saving && <p role="alert" className={styles.error}>{error}</p>}
      {success && <p role="status" className={styles.success}>✓ Profil mis à jour !</p>}

      <p className={styles.hint}>
        Formats acceptés : JPEG, PNG, WebP — taille max. {AVATAR_MAX_MB} Mo.
        {hasPhoto
          ? ' Rien n\'est modifié tant que vous n\'avez pas cliqué sur Enregistrer.'
          : ' Cliquez sur l\'avatar ou « Changer la photo » pour en ajouter une.'}
      </p>
    </section>
  )
}
