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

const TYPE_ORDER = ['local', 'grossiste_bio', 'autre'] as const

/** Bandeau latéral : tous les fournisseurs avec commandes ouvertes ; l’actif est surligné. */
export default function CatalogueSupplierSidebar({
  summaries,
  activeSupplierId,
  catalogNow,
  onSelect,
}: Props) {
  const openSuppliers = summaries
    .filter(s => s.hasOpenOrders)
    .sort((a, b) => {
      const ta = TYPE_ORDER.indexOf(a.supplier.type as (typeof TYPE_ORDER)[number])
      const tb = TYPE_ORDER.indexOf(b.supplier.type as (typeof TYPE_ORDER)[number])
      const orderA = ta >= 0 ? ta : TYPE_ORDER.length
      const orderB = tb >= 0 ? tb : TYPE_ORDER.length
      if (orderA !== orderB) return orderA - orderB
      return a.supplier.name.localeCompare(b.supplier.name, 'fr')
    })

  if (openSuppliers.length < 2) return null

  return (
    <aside className="catalogue-supplier-sidebar" aria-label="Fournisseurs avec commandes ouvertes">
      <p className="catalogue-supplier-sidebar__title">Fournisseurs — commandes ouvertes</p>
      <ul className="catalogue-supplier-sidebar__list">
        {openSuppliers.map(summary => {
          const isActive = summary.supplier.id === activeSupplierId
          const display = getSupplierDisplayInfo(
            summary.supplier.name,
            summary.supplier.type,
          )
          const status = supplierOrderStatusLabel(summary.supplier, catalogNow)
          return (
            <li key={summary.supplier.id}>
              {isActive ? (
                <div
                  className="catalogue-supplier-sidebar__btn catalogue-supplier-sidebar__btn--active"
                  aria-current="page"
                >
                  <span className="catalogue-supplier-sidebar__emoji" aria-hidden>
                    {display.emoji}
                  </span>
                  <span className="catalogue-supplier-sidebar__label">
                    <span className="catalogue-supplier-sidebar__name">{summary.supplier.name}</span>
                    <span className="catalogue-supplier-sidebar__meta">{status.label}</span>
                  </span>
                </div>
              ) : (
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
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
