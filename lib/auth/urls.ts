/**
 * URL publique du site pour les redirections Supabase (inscription, reset mot de passe).
 * En production, NEXT_PUBLIC_SITE_URL doit pointer vers le domaine réel (ex. https://leptitmag.org)
 * pour éviter les liens email vers localhost.
 */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}

/** URL de callback Supabase, avec redirection finale optionnelle (ex. /fr/mon-compte). */
export function authCallbackUrl(next?: string): string {
  const base = `${getSiteOrigin()}/auth/callback`
  if (!next) return base
  return `${base}?next=${encodeURIComponent(next)}`
}
