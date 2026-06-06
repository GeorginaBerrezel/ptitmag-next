'use client'

import { useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import type { Profile } from '@/lib/supabase/auth'
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

  const displayName = profile?.username ?? profile?.full_name?.split(' ')[0] ?? 'Adhérent·e'
  const shownAvatar = previewUrl ?? avatarUrl

  function openFilePicker() {
    fileRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    if (username.trim() !== (profile?.username ?? '')) {
      formData.append('username', username.trim())
    }
    if (pendingFile) {
      formData.append('avatar', pendingFile)
    }

    if (!formData.has('username') && !formData.has('avatar')) {
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

    if (data.updates?.avatar_url) setAvatarUrl(data.updates.avatar_url)
    setPendingFile(null)
    setPreviewUrl(null)
    setEditing(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  function handleCancel() {
    setUsername(profile?.username ?? '')
    setPendingFile(null)
    setPreviewUrl(null)
    setEditing(false)
    setError(null)
  }

  return (
    <section className={styles.card} aria-label="Profil">
      <div className={styles.avatarWrap}>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={openFilePicker}
          aria-label="Changer ma photo de profil"
        >
          <Avatar
            src={shownAvatar}
            name={profile?.full_name ?? profile?.username}
            email={profile?.email}
            userId={profile?.id}
            size={80}
            editable
          />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={openFilePicker}
          className={styles.editPhotoBtn}
          aria-label="Changer ma photo de profil"
        >
          ✎
        </button>
      </div>

      {editing ? (
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Votre pseudo…"
          maxLength={30}
          autoFocus
          className={styles.usernameInput}
          aria-label="Pseudo affiché sur le site"
        />
      ) : (
        <div className={styles.nameRow}>
          <span className={styles.displayName}>{displayName}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={styles.editNameBtn}
            aria-label="Modifier mon pseudo"
          >
            ✎
          </button>
        </div>
      )}

      {profile?.full_name && profile.username && (
        <p className={styles.fullName}>{profile.full_name}</p>
      )}

      {editing && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={handleCancel} className={styles.cancelBtn}>
            Annuler
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>✓ Profil mis à jour !</p>}

      <p className={styles.hint}>
        Cliquez sur l&apos;avatar pour changer la photo — rien n&apos;est envoyé tant que vous n&apos;avez pas
        cliqué sur Enregistrer.
      </p>
    </section>
  )
}
