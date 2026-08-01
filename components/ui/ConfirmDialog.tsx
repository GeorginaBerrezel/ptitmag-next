'use client'

import { useCallback, useEffect, useId, useRef, type RefObject } from 'react'
import styles from './confirm-dialog.module.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  cancelLabel?: string
  confirmLabel: string
  /** danger = destructive (default) ; primary = action positive */
  confirmTone?: 'danger' | 'primary'
  onClose: () => void
  onConfirm: () => void
  /** Bouton / élément qui a ouvert le dialog — focus restauré à la fermeture */
  returnFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/** Dialog de confirmation accessible (Escape, focus trap, aria-modal). */
export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel = 'Annuler',
  confirmLabel,
  confirmTone = 'danger',
  onClose,
  onConfirm,
  returnFocusRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  const close = useCallback(() => {
    onClose()
    returnFocusRef?.current?.focus()
  }, [onClose, returnFocusRef])

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    cancelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !dialog) return

      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open) return null

  const confirmClass =
    confirmTone === 'danger'
      ? `${styles.dialogBtn} ${styles.confirmDanger}`
      : `btn btn-primary ${styles.dialogBtn}`

  return (
    <div className={styles.backdrop} role="presentation" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <p id={descId} className={styles.dialogText}>
          {description}
        </p>
        <div className={styles.dialogActions}>
          <button
            ref={cancelRef}
            type="button"
            className={`btn btn-outline ${styles.dialogBtn}`}
            onClick={close}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
