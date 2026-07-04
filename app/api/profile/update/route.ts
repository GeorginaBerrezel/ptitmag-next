import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AVATAR_MAX_BYTES, avatarTooLargeMessage } from '@/lib/profile/avatar-upload'
import { validateLocalitySelection } from '@/lib/localities/search'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const formData = await request.formData()
  const username = formData.get('username') as string | null
  const avatarFile = formData.get('avatar') as File | null
  const removeAvatar = formData.get('remove_avatar') === 'true'
  const postalCode = formData.get('postal_code') as string | null
  const commune = formData.get('commune') as string | null

  const updates: Record<string, string | null> = {}

  if (postalCode !== null && commune !== null) {
    const localityError = validateLocalitySelection(postalCode, commune)
    if (localityError) {
      return NextResponse.json({ error: localityError }, { status: 400 })
    }
    updates.postal_code = postalCode.trim()
    updates.commune = commune.trim()
  }

  if (username !== null) {
    const clean = username.trim().slice(0, 30)
    if (clean.length < 2) {
      return NextResponse.json({ error: 'Le pseudo doit faire au moins 2 caractères.' }, { status: 400 })
    }
    updates.username = clean
  }

  const adminClient = createAdminClient()

  if (removeAvatar) {
    updates.avatar_url = null

    const { data: existingFiles } = await adminClient.storage
      .from('avatars')
      .list(user.id)

    if (existingFiles?.length) {
      const paths = existingFiles.map(f => `${user.id}/${f.name}`)
      await adminClient.storage.from('avatars').remove(paths)
    }
  }

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: avatarTooLargeMessage(avatarFile.size) }, { status: 400 })
    }

    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const arrayBuffer = await avatarFile.arrayBuffer()

    const { data: buckets } = await adminClient.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'avatars')
    if (!bucketExists) {
      const { error: bucketError } = await adminClient.storage.createBucket('avatars', { public: true })
      if (bucketError) {
        return NextResponse.json({ error: `Impossible de créer le bucket : ${bucketError.message}` }, { status: 500 })
      }
    }

    const contentType = avatarFile.type || 'image/jpeg'
    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload échoué : ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage.from('avatars').getPublicUrl(path)
    updates.avatar_url = `${urlData.publicUrl}?v=${Date.now()}`
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour.' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: `Mise à jour échouée : ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, updates })
}
