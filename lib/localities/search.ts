import localities from '@/lib/localities/swiss-localities.json'
import { localitySearchText, normalizeCommuneKey } from '@/lib/localities/normalize'
import type { LocalitySelection, SwissLocality } from '@/lib/localities/types'

const ENTRIES = localities as SwissLocality[]

const byPostalAndName = new Map<string, SwissLocality>()
for (const entry of ENTRIES) {
  byPostalAndName.set(`${entry.postalCode}\0${entry.name}`, entry)
}

export function getSwissLocalities(): readonly SwissLocality[] {
  return ENTRIES
}

export function isValidLocality(postalCode: string, commune: string): boolean {
  return byPostalAndName.has(`${postalCode.trim()}\0${commune.trim()}`)
}

export function findLocality(postalCode: string, commune: string): SwissLocality | undefined {
  return byPostalAndName.get(`${postalCode.trim()}\0${commune.trim()}`)
}

export function searchLocalities(query: string, limit = 8): SwissLocality[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // NPA seul → toutes les localités (certains NPA valaisans en ont 9–12)
  if (/^\d{4}$/.test(trimmed)) {
    return ENTRIES
      .filter(entry => entry.postalCode === trimmed)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  const terms = localitySearchText(trimmed, '').split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const digitPrefix = trimmed.replace(/\D/g, '').slice(0, 4)
  const scored: Array<{ entry: SwissLocality; score: number }> = []

  for (const entry of ENTRIES) {
    const haystack = localitySearchText(entry.postalCode, entry.name)
    if (!terms.every(term => haystack.includes(term))) continue

    let score = 0
    if (digitPrefix.length >= 2 && entry.postalCode.startsWith(digitPrefix)) {
      score += digitPrefix.length === 4 && entry.postalCode === digitPrefix ? 100 : 50
    }
    const nameHaystack = localitySearchText('', entry.name)
    if (terms.some(term => nameHaystack.includes(term))) score += 30
    scored.push({ entry, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const zip = a.entry.postalCode.localeCompare(b.entry.postalCode, 'fr', { numeric: true })
    if (zip !== 0) return zip
    return a.entry.name.localeCompare(b.entry.name, 'fr')
  })

  return scored.slice(0, limit).map(s => s.entry)
}

export function toLocalitySelection(entry: SwissLocality): LocalitySelection {
  return { postalCode: entry.postalCode, commune: entry.name }
}

export function validateLocalitySelection(
  postalCode: string,
  commune: string,
): string | null {
  const zip = postalCode.trim()
  const name = commune.trim()
  if (!/^\d{4}$/.test(zip)) return 'Le NPA doit comporter 4 chiffres (ex. 1966).'
  if (name.length < 2) return 'Sélectionnez votre localité dans la liste.'
  if (!isValidLocality(zip, name)) {
    return 'Localité invalide. Choisissez une suggestion dans la liste.'
  }
  return null
}

export function findCanonicalCommune(raw: string): { key: string; label: string } | null {
  const terms = normalizeCommuneKey(raw).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return null

  let best: SwissLocality | null = null
  for (const entry of ENTRIES) {
    const entryKey = normalizeCommuneKey(entry.name)
    if (!terms.every(term => entryKey.includes(term))) continue
    if (!best || entry.name.length < best.name.length) best = entry
  }

  if (!best) return null
  return { key: normalizeCommuneKey(best.name), label: best.name }
}

export function communeFilterMatch(
  memberCommune: string | null | undefined,
  filterKey: string,
): boolean {
  if (!filterKey) return true
  const memberKey = normalizeCommuneKey(memberCommune)
  if (memberKey === filterKey) return true
  const canonical = memberCommune ? findCanonicalCommune(memberCommune) : null
  return canonical?.key === filterKey
}

/** Regroupe les libellés commune bruts par clé normalisée (filtre admin). */
export function groupCommuneLabels(
  rawLabels: string[],
): Array<{ key: string; label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>()

  for (const raw of rawLabels) {
    const canonical = findCanonicalCommune(raw)
    const key = canonical?.key ?? normalizeCommuneKey(raw)
    if (!key) continue
    const label = canonical?.label ?? raw
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { label, count: 1 })
    }
  }

  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}
