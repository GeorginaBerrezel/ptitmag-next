'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { formatLocalityLabel } from '@/lib/localities/normalize'
import type { LocalitySelection, SwissLocality } from '@/lib/localities/types'
import styles from './locality-combobox.module.css'

type Props = {
  id?: string
  postalCode: string
  commune: string
  onChange: (selection: LocalitySelection | null) => void
  required?: boolean
  disabled?: boolean
  invalid?: boolean
  hint?: string
  label?: string
}

let localitiesPromise: Promise<SwissLocality[]> | null = null

function loadLocalities(): Promise<SwissLocality[]> {
  if (!localitiesPromise) {
    localitiesPromise = import('@/lib/localities/search').then(mod => [...mod.getSwissLocalities()])
  }
  return localitiesPromise
}

export default function LocalityCombobox({
  id,
  postalCode,
  commune,
  onChange,
  required = false,
  disabled = false,
  invalid = false,
  hint = 'Tapez un NPA (ex. 1966) ou un nom de village, puis choisissez dans la liste.',
  label = 'NPA ou localité',
}: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listboxId = `${inputId}-listbox`
  const hintId = `${inputId}-hint`
  const statusId = `${inputId}-status`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<SwissLocality[]>([])
  const [ready, setReady] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchModRef = useRef<typeof import('@/lib/localities/search') | null>(null)

  const hasSelection = Boolean(postalCode && commune)
  const displayValue = hasSelection ? formatLocalityLabel({ postalCode, commune }) : query

  useEffect(() => {
    let cancelled = false
    void loadLocalities().then(async () => {
      searchModRef.current = await import('@/lib/localities/search')
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [])

  const runSearch = useCallback(async (value: string) => {
    if (!searchModRef.current) {
      searchModRef.current = await import('@/lib/localities/search')
    }
    const results = searchModRef.current.searchLocalities(value, 8)
    setSuggestions(results)
    setActiveIndex(results.length > 0 ? 0 : -1)
    setStatusMessage(
      results.length === 0
        ? 'Aucun résultat.'
        : `${results.length} suggestion${results.length > 1 ? 's' : ''}.`,
    )
  }, [])

  useEffect(() => {
    if (!open || !ready) return
    const timer = window.setTimeout(() => {
      void runSearch(query)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [query, open, ready, runSearch])

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function selectEntry(entry: SwissLocality) {
    onChange({ postalCode: entry.postalCode, commune: entry.name })
    setQuery('')
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    setStatusMessage(`${entry.postalCode} ${entry.name} sélectionné.`)
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
    setOpen(true)
  }

  function handleInputChange(value: string) {
    if (hasSelection) {
      clearSelection()
    }
    setQuery(value)
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }

    if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (suggestions.length === 0 ? -1 : (i + 1) % suggestions.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i =>
        suggestions.length === 0 ? -1 : (i <= 0 ? suggestions.length - 1 : i - 1),
      )
    } else if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault()
      selectEntry(suggestions[activeIndex])
    }
  }

  return (
    <div className={styles.field} ref={containerRef}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required && <span className={styles.requiredMark}> *</span>}
      </label>

      <div className={styles.inputWrap}>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-describedby={`${hintId} ${statusId}`}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          value={displayValue}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => {
            if (!hasSelection) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          required={required}
          disabled={disabled || !ready}
          autoComplete="off"
          enterKeyHint="next"
          placeholder={ready ? '1966 ou St-Romain…' : 'Chargement des localités…'}
          className={`${styles.input} ${invalid ? styles.inputInvalid : ''}`}
        />
        {hasSelection && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clearSelection}
            aria-label="Effacer la localité sélectionnée"
          >
            ✕
          </button>
        )}
      </div>

      <p id={hintId} className={styles.hint}>{hint}</p>
      <p id={statusId} className="sr-only" aria-live="polite">{statusMessage}</p>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Suggestions de localité"
          className={styles.listbox}
        >
          {suggestions.map((entry, index) => (
            <li
              key={`${entry.postalCode}-${entry.name}`}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={e => {
                e.preventDefault()
                selectEntry(entry)
              }}
            >
              <span className={styles.optionNpa}>{entry.postalCode}</span>
              <span className={styles.optionName}>{entry.name}</span>
              <span className={styles.optionCanton}>{entry.canton}</span>
            </li>
          ))}
        </ul>
      )}

      {open && ready && query.trim().length >= 2 && suggestions.length === 0 && (
        <p className={styles.empty} role="status">
          Aucune localité trouvée. Vérifiez l&apos;orthographe ou essayez le NPA.
        </p>
      )}
    </div>
  )
}
