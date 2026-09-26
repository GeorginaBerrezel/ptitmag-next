'use client'

import { useEffect, useState } from 'react'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import styles from './AdminShareCartons.module.css'

type Carton = {
  id: string
  productName: string
  supplierName: string
  targetLabel: string
  deadlineAt: string | null
  label: string
  members: string[]
}

export default function AdminShareCartons() {
  const [cartons, setCartons] = useState<Carton[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/admin/sharing')
      .then(res => res.ok ? res.json() : { cartons: [] })
      .then(data => {
        if (!cancelled) setCartons(Array.isArray(data.cartons) ? data.cartons : [])
      })
      .catch(() => {
        if (!cancelled) setCartons([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!cartons || cartons.length === 0) return null

  return (
    <details className={styles.box}>
      <summary className={styles.summary}>
        Cartons partagés
        <span className={styles.count}>{cartons.length}</span>
      </summary>
      <p className={styles.lead}>
        Seulement les partages encore en cours. Un carton = une commande chez le fournisseur.
      </p>
      <ul className={styles.list}>
        {cartons.map(carton => (
          <li key={carton.id} className={styles.card}>
            <p className={styles.product}>
              1 carton · {carton.productName}
              <span className={styles.meta}> · {carton.targetLabel} · {carton.supplierName}</span>
            </p>
            <p className={styles.meta}>
              {carton.label}
              {carton.deadlineAt ? ` · limite ${formatSupplierOrderDeadline(carton.deadlineAt)}` : ''}
            </p>
            <p className={styles.people}>{carton.members.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
