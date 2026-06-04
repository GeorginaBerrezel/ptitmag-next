/** Archivage admin — commandes livrées masquées après ce délai. */

export const ARCHIVE_AFTER_MONTHS = 6

export type ArchivableOrder = {
  status: string
  created_at: string
  archived_at?: string | null
}

export function archiveCutoffDate(from = new Date()): Date {
  const cutoff = new Date(from)
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_AFTER_MONTHS)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

export function isEligibleForArchive(order: ArchivableOrder, from = new Date()): boolean {
  if (order.archived_at) return false
  if (order.status !== 'closed') return false
  return new Date(order.created_at) < archiveCutoffDate(from)
}

export function countEligibleForArchive(orders: ArchivableOrder[], from = new Date()): number {
  return orders.filter(o => isEligibleForArchive(o, from)).length
}
