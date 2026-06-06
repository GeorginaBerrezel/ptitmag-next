import accordionStyles from './accordion.module.css'

/** Indicateur visuel standard pour <details> (WCAG — pas seulement la couleur). */
export default function AccordionChevron({ className }: { className?: string }) {
  return (
    <span
      className={[accordionStyles.chevron, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      ▼
    </span>
  )
}
