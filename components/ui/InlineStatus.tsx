import styles from './inline-status.module.css'

type InlineStatusProps = {
  message: string
  /** polite = mise à jour non urgente ; assertive = action en cours importante */
  live?: 'polite' | 'assertive'
  className?: string
}

/** Texte + spinner accessible (WCAG : role=status, aria-live, reduced-motion). */
export function InlineStatus({
  message,
  live = 'polite',
  className,
}: InlineStatusProps) {
  return (
    <p
      role="status"
      aria-live={live}
      className={[styles.inlineStatus, className].filter(Boolean).join(' ')}
    >
      <span className={styles.spinner} aria-hidden />
      {message}
    </p>
  )
}

type LoadingOverlayProps = {
  message: string
  live?: 'polite' | 'assertive'
}

/** Overlay circulaire (avatar, vignette…) pendant une action async. */
export function LoadingOverlay({ message, live = 'polite' }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay} role="status" aria-live={live} aria-busy="true">
      <span className={`${styles.spinner} ${styles.overlaySpinner}`} aria-hidden />
      <p className={styles.overlayMessage}>{message}</p>
    </div>
  )
}
