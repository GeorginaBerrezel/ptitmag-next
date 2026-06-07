/**
 * Comptes autorisés sur /admin (accès complet, y compris Fournisseurs).
 * Joel : info@leptitmag.org — Georgina : georgina.berrezel@gmail.com
 */
const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
] as const

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email)
  return e !== '' && (ADMIN_EMAILS as readonly string[]).includes(e)
}
