import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const updates: Record<string, string> = {}

  if (username !== null) {
    const clean = username.trim().slice(0, 30)
    if (clean.length < 2) {
      return NextResponse.json({ error: 'Le pseudo doit faire au moins 2 caractères.' }, { status: 400 })
    }
    updates.username = clean
  }

  // Upload de la photo de profil
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'La photo ne doit pas dépasser 2 Mo.' }, { status: 400 })
    }

    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const arrayBuffer = await avatarFile.arrayBuffer()

    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: avatarFile.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload échoué : ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage.from('avatars').getPublicUrl(path)
    updates.avatar_url = `${urlData.publicUrl}?t=${Date.now()}`
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour.' }, { status: 400 })
  }

  // Utiliser le client admin pour bypasser les éventuelles policies RLS restrictives
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: `Mise à jour échouée : ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, updates })
}
