import { getCielPriceBreakdown } from '@/lib/catalog/ciel-price-display'
import styles from './ciel-price-hint.module.css'

type Props = {
  baseUnitPrice: number
  className?: string
}

/** Prix membre Ciel : rappelle le prix Terre et que la majoration est déjà incluse. */
export default function CielPriceHint({ baseUnitPrice, className }: Props) {
  const { basePrice, markupAmount } = getCielPriceBreakdown(baseUnitPrice)

  return (
    <p className={`${styles.hint} ${className ?? ''}`}>
      Prix catalogue Terre&nbsp;: CHF {basePrice.toFixed(2)}
      {' '}— majoration +20&nbsp;% incluse (+CHF {markupAmount.toFixed(2)})
    </p>
  )
}
