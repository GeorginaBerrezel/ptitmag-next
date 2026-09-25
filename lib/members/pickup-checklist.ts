const STORAGE_PREFIX = 'ptitmag-pickup-checklist'

const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Garde uniquement des identifiants de ligne de commande. */
export function normalizePickupIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  for (const id of raw) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!ITEM_ID.test(trimmed)) continue
    seen.add(trimmed)
  }
  return [...seen]
}

/** Réunit le compte et ce navigateur. toAdd = coches locales pas encore en base. */
export function mergePickupIds(serverIds: string[], localIds: string[]): { all: string[]; toAdd: string[] } {
  const server = new Set(serverIds)
  const toAdd = localIds.filter(id => !server.has(id))
  return { all: [...serverIds, ...toAdd], toAdd }
}

export function pickupChecklistStorageKey(memberId: string): string {
  return `${STORAGE_PREFIX}:${memberId}`
}

export function readPickupChecklist(memberId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()

  try {
    const raw = localStorage.getItem(pickupChecklistStorageKey(memberId))
    if (!raw) return new Set()
    const ids = JSON.parse(raw) as unknown
    if (!Array.isArray(ids)) return new Set()
    return new Set(ids.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function writePickupChecklist(memberId: string, pickedItemIds: Set<string>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    pickupChecklistStorageKey(memberId),
    JSON.stringify([...pickedItemIds]),
  )
}
