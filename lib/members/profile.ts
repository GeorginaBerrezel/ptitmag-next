/** Libellés et helpers statut membre (Ciel / Terre / Non membre). */

export const MEMBER_STATUS_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  non_membre: { label: 'Non membre',  bg: '#f3f4f6', color: '#4b5563', border: '#9ca3af' },
  ciel:       { label: 'Membre Ciel', bg: '#e3f2fd', color: '#1565c0', border: '#1565c0' },
  terre:      { label: 'Membre Terre', bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
  /** @deprecated ancien libellé — migré en non_membre */
  trial:      { label: 'Non membre',  bg: '#f3f4f6', color: '#4b5563', border: '#9ca3af' },
  /** @deprecated ancien libellé — migré en terre */
  member:     { label: 'Membre Terre', bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
}

export type ProfileCotisation = {
  status?: string | null
  cotisation_amount?: number | null
  cotisation_active?: boolean | null
}

export function getMemberStatusDisplay(status?: string | null) {
  const key = status ?? 'non_membre'
  return MEMBER_STATUS_LABELS[key] ?? MEMBER_STATUS_LABELS.non_membre
}

/** Accès catalogue : Joel a validé le statut Ciel ou Terre. */
export function canAccessCatalog(p: ProfileCotisation): boolean {
  const s = p.status
  return s === 'ciel' || s === 'terre'
}

/** Membre Terre : prix catalogue sans marge (+ legacy member). */
export function hasTerrePricing(p: ProfileCotisation): boolean {
  return p.status === 'terre' || p.status === 'member'
}

/** Membre Ciel : majoration +20 % sur le catalogue. */
export function applyCielMarkup(p: ProfileCotisation): boolean {
  return p.status === 'ciel'
}

/** @deprecated Préférer hasTerrePricing / applyCielMarkup */
export function isCotiseProfile(p: ProfileCotisation): boolean {
  return hasTerrePricing(p)
}

export function formatCotisation(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '—'
  return `CHF ${amount.toFixed(2)}`
}

/** Statuts modifiables par Joel dans l'admin. */
export const ADMIN_MEMBER_STATUSES = ['non_membre', 'ciel', 'terre'] as const
export type AdminMemberStatus = (typeof ADMIN_MEMBER_STATUSES)[number]

/** Normalise les anciens statuts trial/member encore en base. */
export function normalizeMemberStatus(status?: string | null): AdminMemberStatus {
  if (!status || status === 'trial') return 'non_membre'
  if (status === 'member') return 'terre'
  if (status === 'ciel' || status === 'terre' || status === 'non_membre') return status
  return 'non_membre'
}

export function isActiveMemberStatus(status?: string | null): boolean {
  const s = normalizeMemberStatus(status)
  return s === 'ciel' || s === 'terre'
}
