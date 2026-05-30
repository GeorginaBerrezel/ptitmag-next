import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteOriginFromRequest, authCallbackUrl } from '@/lib/auth/urls'
import { normalizeRegistration, validateRegistration, type RegistrationInput } from '@/lib/members/registration'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_MEMBER_STATUS = 'non_membre'

function createAuthClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/**
 * Inscription serveur : signUp Supabase (e-mail de confirmation) + profil complet.
 * Statut initial = non_membre (accès catalogue après validation Joel).
 */
export async function POST(request: NextRequest) {
  let body: RegistrationInput & { locale?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const validationError = validateRegistration(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const data = normalizeRegistration(body)
  const locale = body.locale === 'en' ? 'en' : 'fr'
  const siteOrigin = siteOriginFromRequest(request)
  const auth = createAuthClient()

  const { data: authData, error: authError } = await auth.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: data.full_name,
        phone: data.phone,
        postal_code: data.postal_code,
        commune: data.commune,
      },
      emailRedirectTo: authCallbackUrl(`/${locale}/mon-compte`, siteOrigin),
    },
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse e-mail.' },
        { status: 409 },
      )
    }
    console.error('[auth/register] signUp:', authError)
    return NextResponse.json(
      { error: 'Impossible de créer le compte. Réessayez ou contactez Joel.' },
      { status: 500 },
    )
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: 'Impossible de créer le compte. Réessayez ou contactez Joel.' },
      { status: 500 },
    )
  }

  const admin = createAdminClient()

  const profileFields = {
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    full_name: data.full_name,
    phone: data.phone,
    postal_code: data.postal_code,
    commune: data.commune,
    status: DEFAULT_MEMBER_STATUS,
  }

  const { data: updatedRows, error: profileError } = await admin
    .from('profiles')
    .update(profileFields)
    .eq('id', authData.user.id)
    .select('id')

  if (profileError) {
    console.error('[auth/register] profile update:', profileError)
    return NextResponse.json(
      { error: 'Compte créé mais profil incomplet. Contactez Joel avec votre e-mail.' },
      { status: 500 },
    )
  }

  if (!updatedRows?.length) {
    const { error: insertError } = await admin.from('profiles').insert({
      id: authData.user.id,
      ...profileFields,
    })
    if (insertError) {
      console.error('[auth/register] profile insert:', insertError)
      return NextResponse.json(
        { error: 'Compte créé mais profil incomplet. Contactez Joel avec votre e-mail.' },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ success: true, email: data.email })
}
