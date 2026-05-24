/** Libellés et helpers statut membre (plus de « essai 3 mois »). */

export const MEMBER_STATUS_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  trial:  { label: 'Non cotisé', bg: '#f3f4f6', color: '#4b5563', border: '#9ca3af' },
  member: { label: 'Cotisé',     bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
}

export type ProfileCotisation = {
  status?: string | null
  cotisation_amount?: number | null
  cotisation_active?: boolean | null
}

export function isCotiseProfile(p: ProfileCotisation): boolean {
  if (p.status === 'member') return true
  const amount = p.cotisation_amount
  return amount != null && amount > 0
}

export function formatCotisation(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '—'
  return `CHF ${amount.toFixed(2)}`
}
