'use client'

import { useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import type { Profile } from '@/lib/supabase/auth'

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
    <div style={{
      background: '#fff',
      border: '1px solid rgba(16,24,40,0.08)',
      borderRadius: 16,
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '0.75rem',
    }}>
      {/* Avatar cliquable */}
      <div style={{ position: 'relative' }}>
        <Avatar
          src={shownAvatar}
          name={profile?.full_name ?? profile?.username}
          email={profile?.email}
          userId={profile?.id}
          size={80}
          onClick={() => fileRef.current?.click()}
          editable
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#DC7F00',
            border: '2px solid #fff',
            color: '#fff',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
          title="Changer la photo"
        >
          ✎
        </button>
      </div>

      {/* Pseudo */}
      {editing ? (
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Votre pseudo…"
          maxLength={30}
          autoFocus
          style={{
            textAlign: 'center',
            fontSize: '1.15rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: '2px solid #DC7F00',
            outline: 'none',
            background: 'transparent',
            padding: '0.1rem 0.5rem',
            width: '100%',
            maxWidth: 220,
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {displayName}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '0.85rem',
              padding: '0.2rem',
            }}
            title="Modifier le pseudo"
          >
            ✎
          </button>
        </div>
      )}

      {profile?.full_name && profile.username && (
        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.55 }}>{profile.full_name}</p>
      )}

      {/* Boutons save/cancel */}
      {editing && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#1a1a2e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.4rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(16,24,40,0.15)',
              borderRadius: 8,
              padding: '0.4rem 0.9rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#c0392b' }}>{error}</p>
      )}
      {success && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#2e7d32' }}>✓ Profil mis à jour !</p>
      )}

      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.4 }}>
        Cliquez sur l&apos;avatar pour changer la photo
      </p>
    </div>
  )
}
