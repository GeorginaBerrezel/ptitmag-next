import { nextWednesday1830, nextThursday1200 } from '@/lib/import/deadline-defaults'
import type { Supplier } from '@/lib/supabase/products'

/** Prochaine fenêtre de commande (règle Joel : jeudi 12h, exceptions mercredi 18h30). */
export function nextOrderWindowForSupplier(
  supplier: Pick<Supplier, 'type' | 'name'>,
  refMs: number,
): Date {
  const ref = new Date(refMs)
  const lower = supplier.name.toLowerCase()
  if (
    supplier.type === 'local' &&
    (lower.includes('graines') || lower.includes('truff'))
  ) {
    return nextWednesday1830(ref)
  }
  return nextThursday1200(ref)
}

export function formatOrderWindow(d: Date): string {
  return d.toLocaleString('fr-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}
