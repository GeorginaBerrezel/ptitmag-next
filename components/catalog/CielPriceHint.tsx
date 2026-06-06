import { getCielPriceBreakdown } from '@/lib/catalog/ciel-price-display'
import styles from './ciel-price-hint.module.css'

type Props = {
  baseUnitPrice: number
  className?: string
}

/** Prix membre Ciel : prix Terre + rappel que la majoration est déjà dans le total affiché. */
export default function CielPriceHint({ baseUnitPrice, className }: Props) {
  const { basePrice, markupAmount } = getCielPriceBreakdown(baseUnitPrice)

  return (
    <div
      className={`${styles.hint} ${className ?? ''}`}
      role="note"
      aria-label={`Prix Terre ${basePrice.toFixed(2)} francs. Majoration membre Ciel de 20 pour cent déjà incluse, soit ${markupAmount.toFixed(2)} francs.`}
    >
      <p className={`${styles.line} ${styles.lineTerre}`}>
        Prix Terre&nbsp;: CHF {basePrice.toFixed(2)}
      </p>
      <p className={`${styles.line} ${styles.lineCiel}`}>
        +20&nbsp;% Ciel inclus (+CHF {markupAmount.toFixed(2)})
      </p>
    </div>
  )
}
