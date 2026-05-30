import type { NextRequest } from 'next/server'

const ALLOWED_HOSTS = [
  'localhost',
  'preprod.leptitmag.org',
  'www.leptitmag.org',
  'leptitmag.org',
  'ptitmag-next.vercel.app',
] as const

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (ALLOWED_HOSTS.includes(host as (typeof ALLOWED_HOSTS)[number])) return true
  return host.endsWith('.vercel.app')
}

/**
 * URL publique du site pour les redirections Supabase (inscription, reset mot de passe).
 * En production, NEXT_PUBLIC_SITE_URL doit pointer vers le domaine réel.
 */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}

/** Origine autorisée (preprod, prod, localhost…) — évite les redirections open. */
export function resolveSiteOrigin(origin?: string | null): string {
  if (origin) {
    try {
      const { hostname, origin: resolved } = new URL(origin)
      if (isAllowedHost(hostname)) return resolved.replace(/\/$/, '')
    } catch {
      /* ignore */
    }
  }
  return getSiteOrigin()
}

/** Origine déduite de la requête API (preprod si l'inscription vient de preprod). */
export function siteOriginFromRequest(request: NextRequest): string {
  const origin = request.headers.get('origin')
  if (origin) return resolveSiteOrigin(origin)

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return resolveSiteOrigin(new URL(referer).origin)
    } catch {
      /* ignore */
    }
  }

  return getSiteOrigin()
}

/** URL de callback Supabase, avec redirection finale optionnelle (ex. /fr/mon-compte). */
export function authCallbackUrl(next?: string, origin?: string | null): string {
  const base = `${resolveSiteOrigin(origin)}/auth/callback`
  if (!next) return base
  return `${base}?next=${encodeURIComponent(next)}`
}
