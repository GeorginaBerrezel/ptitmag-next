import { normalizeSearch } from '@/lib/catalog/search'
import type { LocalitySelection } from '@/lib/localities/types'

/** Clé de comparaison commune — casse, accents, tirets et parenthèses neutralisés. */
export function normalizeCommuneKey(value: string | null | undefined): string {
  if (!value) return ''
  return normalizeSearch(value)
    .replace(/[()[\]]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function communesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeCommuneKey(a) === normalizeCommuneKey(b)
}

/** Texte indexé pour la recherche NPA + localité. */
export function localitySearchText(postalCode: string, name: string): string {
  return normalizeCommuneKey(`${postalCode} ${name}`)
}

export function formatLocalityLabel(selection: LocalitySelection): string {
  return `${selection.postalCode} · ${selection.commune}`
}
