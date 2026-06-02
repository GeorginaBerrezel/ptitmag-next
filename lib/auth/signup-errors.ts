import type { AuthError } from '@supabase/supabase-js'

/** Message affiché à l'utilisateur après un échec Supabase signUp (sans détail technique). */
export function signUpErrorMessage(error: AuthError): string {
  const code = (error.code ?? '').toLowerCase()
  const msg = error.message.toLowerCase()

  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
    return 'Trop de demandes d’inscription en ce moment. Réessayez dans une heure ou écrivez à info@leptitmag.org.'
  }

  if (code === 'email_address_invalid' || msg.includes('invalid email')) {
    return 'Adresse e-mail invalide. Vérifiez l’orthographe.'
  }

  if (msg.includes('password') || code.includes('password')) {
    return 'Mot de passe refusé (8 caractères minimum). Choisissez un mot de passe plus long ou plus varié.'
  }

  if (msg.includes('signup') && msg.includes('disabled')) {
    return 'Les inscriptions sont temporairement fermées. Contactez info@leptitmag.org.'
  }

  return 'Impossible de créer le compte pour le moment. Réessayez plus tard ou contactez info@leptitmag.org.'
}
