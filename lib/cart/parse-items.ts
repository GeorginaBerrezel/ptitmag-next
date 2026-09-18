import type { CartItem } from './types'

const MAX_ITEMS = 80
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function clip(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max)
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Valide le JSON panier (API + localStorage). Ignore les lignes cassées. */
export function parseCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return []
  const items: CartItem[] = []
  for (const row of raw.slice(0, MAX_ITEMS)) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const productId = clip(r.productId, 80)
    const supplierId = clip(r.supplierId, 80)
    if (!UUID_RE.test(productId) || !UUID_RE.test(supplierId)) continue
    const quantity = asNumber(r.quantity)
    const unitPrice = asNumber(r.unitPrice)
    const minQuantity = asNumber(r.minQuantity)
    const productName = clip(r.productName, 200)
    if (!quantity || unitPrice == null || !minQuantity || !productName) continue
    items.push({
      productId,
      productName,
      supplierRef: r.supplierRef == null || r.supplierRef === '' ? null : clip(r.supplierRef, 40),
      supplierId,
      supplierName: clip(r.supplierName, 120) || 'Fournisseur',
      supplierType: clip(r.supplierType, 40) || 'autre',
      quantity,
      unitPrice,
      unit: clip(r.unit, 40) || 'pièce',
      minQuantity,
      allowsPartialOrder: Boolean(r.allowsPartialOrder),
      fromShare: Boolean(r.fromShare) || undefined,
    })
  }
  return items
}
