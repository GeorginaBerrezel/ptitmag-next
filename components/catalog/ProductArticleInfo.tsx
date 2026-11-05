import { getBiopartnerProductInfoUrl } from '@/lib/catalog/biopartner-product-url'
import styles from './product-article-info.module.css'

type Props = {
  productName: string
  supplierRef?: string | null
  supplierName?: string | null
}

/** Numéro d’article et fiche Biopartner, au même endroit partout. */
export default function ProductArticleInfo({ productName, supplierRef, supplierName }: Props) {
  const ref = supplierRef?.trim() || null
  const url = getBiopartnerProductInfoUrl({
    supplier_ref: ref,
    supplier: supplierName ? { name: supplierName } : null,
  })
  if (!ref && !url) return null

  return (
    <div className={styles.wrap}>
      {ref && <p className={styles.ref}>N° article {ref}</p>}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          aria-label={`Fiche produit complète de ${productName}, nouvel onglet`}
        >
          Fiche produit complète
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  )
}
