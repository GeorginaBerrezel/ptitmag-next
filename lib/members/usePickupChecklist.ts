'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mergePickupIds,
  normalizePickupIds,
  readPickupChecklist,
  writePickupChecklist,
} from './pickup-checklist'

const POLL_MS = 20_000

async function readServerIds(): Promise<string[] | null> {
  const res = await fetch('/api/member/pickup-checks')
  const data = await res.json().catch(() => ({})) as { itemIds?: unknown }
  if (!res.ok) return null
  return normalizePickupIds(data.itemIds)
}

async function sendChange(add: string[], remove: string[]): Promise<string[] | null> {
  const res = await fetch('/api/member/pickup-checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ add, remove }),
  })
  const data = await res.json().catch(() => ({})) as { itemIds?: unknown }
  if (!res.ok) return null
  return normalizePickupIds(data.itemIds)
}

export function usePickupChecklist(memberId: string | undefined) {
  const [pickedItemIds, setPickedItemIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  const dirty = useRef(false)
  const inFlight = useRef(false)
  const memberRef = useRef(memberId)
  const pickedRef = useRef(pickedItemIds)
  memberRef.current = memberId
  pickedRef.current = pickedItemIds

  const requestGen = useRef(0)

  const apply = useCallback((ids: string[], who: string) => {
    const next = new Set(ids)
    pickedRef.current = next
    setPickedItemIds(next)
    writePickupChecklist(who, next)
  }, [])

  useEffect(() => {
    if (!memberId) {
      setPickedItemIds(new Set())
      setReady(true)
      return
    }

    const local = normalizePickupIds([...readPickupChecklist(memberId)])
    setPickedItemIds(new Set(local))
    let cancelled = false

    const ticket = ++requestGen.current

    ;(async () => {
      inFlight.current = true
      try {
        const server = await readServerIds()
        if (cancelled || ticket !== requestGen.current || server == null) return
        const { all, toAdd } = mergePickupIds(server, local)
        const synced = toAdd.length > 0 ? await sendChange(toAdd, []) : all
        if (cancelled || ticket !== requestGen.current || dirty.current || synced == null) return
        apply(synced, memberId)
      } finally {
        inFlight.current = false
        if (!cancelled) setReady(true)
      }
    })()

    return () => { cancelled = true }
  }, [memberId, apply])

  useEffect(() => {
    if (!memberId) return

    async function pull() {
      if (dirty.current || inFlight.current) return
      const who = memberRef.current
      if (!who) return
      const ticket = requestGen.current
      inFlight.current = true
      try {
        const server = await readServerIds()
        if (server && !dirty.current && ticket === requestGen.current) apply(server, who)
      } finally {
        inFlight.current = false
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void pull()
    }

    document.addEventListener('visibilitychange', onVisibility)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull()
    }, POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(id)
    }
  }, [memberId, apply])

  const togglePicked = useCallback((orderItemId: string) => {
    if (!memberId) return
    const id = normalizePickupIds([orderItemId])[0]
    if (!id) return

    const ticket = ++requestGen.current
    const turningOn = !pickedRef.current.has(id)
    const next = new Set(pickedRef.current)
    if (turningOn) next.add(id)
    else next.delete(id)
    pickedRef.current = next
    setPickedItemIds(next)
    writePickupChecklist(memberId, next)
    dirty.current = true
    void sendChange(turningOn ? [id] : [], turningOn ? [] : [id])
      .then(server => {
        if (ticket === requestGen.current && server) apply(server, memberId)
      })
      .finally(() => {
        dirty.current = false
      })
  }, [memberId, apply])

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
