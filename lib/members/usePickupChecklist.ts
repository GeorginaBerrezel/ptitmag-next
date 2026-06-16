'use client'

import { useCallback, useEffect, useState } from 'react'
import { readPickupChecklist, writePickupChecklist } from './pickup-checklist'

export function usePickupChecklist(memberId: string | undefined) {
  const [pickedItemIds, setPickedItemIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!memberId) {
      setPickedItemIds(new Set())
      setReady(true)
      return
    }
    setPickedItemIds(readPickupChecklist(memberId))
    setReady(true)
  }, [memberId])

  const togglePicked = useCallback((orderItemId: string) => {
    if (!memberId) return
    setPickedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(orderItemId)) next.delete(orderItemId)
      else next.add(orderItemId)
      writePickupChecklist(memberId, next)
      return next
    })
  }, [memberId])

  const isPicked = useCallback(
    (orderItemId: string) => pickedItemIds.has(orderItemId),
    [pickedItemIds],
  )

  return {
    ready,
    pickedCount: pickedItemIds.size,
    isPicked,
    togglePicked,
  }
}
