'use client'

import type { CatalogueSupplierSummary } from '@/lib/supabase/catalogue'
import { getSupplierDisplayInfo } from '@/lib/catalog/supplier-info'
import { supplierOrderStatusLabel } from '@/lib/catalog/supplier-orders'

type Props = {
  summaries: CatalogueSupplierSummary[]
  activeSupplierId: string | null
  catalogNow: number
  onSelect: (supplierId: string) => void
}

/** Bandeau : autres fournisseurs avec commandes ouvertes (idée Marc / Joel). */
export default function CatalogueSupplierSidebar({
  summaries,
  activeSupplierId,
  catalogNow,
  onSelect,
}: Props) {
  const others = summaries.filter(
    s => s.supplier.id !== activeSupplierId && s.hasOpenOrders,
  )

  if (others.length === 0) return null

  return (
    <aside className="catalogue-supplier-sidebar" aria-label="Autres fournisseurs ouverts">
      <p className="catalogue-supplier-sidebar__title">Commandes ouvertes</p>
      <ul className="catalogue-supplier-sidebar__list">
        {others.map(summary => {
          const display = getSupplierDisplayInfo(
            summary.supplier.name,
            summary.supplier.type,
          )
          const status = supplierOrderStatusLabel(summary.supplier, catalogNow)
          return (
            <li key={summary.supplier.id}>
              <button
                type="button"
                className="catalogue-supplier-sidebar__btn"
                onClick={() => onSelect(summary.supplier.id)}
              >
                <span className="catalogue-supplier-sidebar__emoji" aria-hidden>
                  {display.emoji}
                </span>
                <span className="catalogue-supplier-sidebar__label">
                  <span className="catalogue-supplier-sidebar__name">{summary.supplier.name}</span>
                  <span className="catalogue-supplier-sidebar__meta">{status.label}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
