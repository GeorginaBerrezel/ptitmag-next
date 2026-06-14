import accordionStyles from './accordion.module.css'

/** Indicateur visuel standard pour <details> (WCAG — pas seulement la couleur). */
export default function AccordionChevron({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <span
        className={[accordionStyles.chevronCompact, className].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        ▼
      </span>
    )
  }

  return (
    <span
      className={[accordionStyles.chevronWrap, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className={accordionStyles.chevron}>▼</span>
    </span>
  )
}
