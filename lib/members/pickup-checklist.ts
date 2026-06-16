const STORAGE_PREFIX = 'ptitmag-pickup-checklist'

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
