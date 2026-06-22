import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMesFavorisPageData } from '@/lib/supabase/wishlist'
import { getProfile } from '@/lib/supabase/auth'
import { canAccessCatalog } from '@/lib/members/profile'
import { getLastOrderedQuantities } from '@/lib/wishlist/last-ordered-quantities'
import { redirect } from 'next/navigation'
import ProductList from '@/components/catalogue/ProductList'
import WishlistBulkAdd from '@/components/wishlist/WishlistBulkAdd'
import WishlistSectionNav from '@/components/wishlist/WishlistSectionNav'
import styles from './mes-favoris.module.css'

export default async function MesFavorisPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const profile = await getProfile()

  if (!profile || !canAccessCatalog(profile)) {
    redirect(`/${locale}/mon-compte`)
  }

  const { manualProducts, suggestionProducts } = await getMesFavorisPageData()
  const allProducts = [...manualProducts, ...suggestionProducts]

  let lastQuantities: Record<string, number> = {}
  if (allProducts.length > 0) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      lastQuantities = await getLastOrderedQuantities(
        supabase,
        user.id,
        allProducts.map(p => p.id),
      )
    }
  }

  const hasManual = manualProducts.length > 0
  const hasSuggestions = suggestionProducts.length > 0

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.pageTitle}>Mes favoris</h1>

      <nav aria-label="Fil d'ariane" className={styles.breadcrumb}>
        <Link href="/" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>
          Accueil
        </Link>
        <span aria-hidden>›</span>
        <Link href="/mon-compte" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>
          Mon compte
        </Link>
        <span aria-hidden>›</span>
        <span className={styles.breadcrumbCurrent} aria-current="page">
          Mes favoris
        </span>
      </nav>

      <p className={styles.intro}>
        Vos favoris et vos achats récurrents, prêts à recomposer en un clic.
      </p>

      <details className={styles.help}>
        <summary className={styles.helpSummary}>Comment ça marche ?</summary>
        <div className={styles.helpBody}>
          <p>
            <strong>Favoris</strong> — vous cliquez sur ♥ dans le catalogue : le produit apparaît ici.
          </p>
          <p>
            <strong>Vos habituels</strong> — le site propose des produits que vous avez déjà commandés au moins 2 fois. Vous pouvez les épingler en favori avec ♥.
          </p>
        </div>
      </details>

      {allProducts.length > 0 && (
        <WishlistBulkAdd
          products={allProducts}
          lastQuantities={lastQuantities}
          locale={locale as 'fr' | 'en'}
        />
      )}

      <WishlistSectionNav
        manualCount={manualProducts.length}
        habitualCount={suggestionProducts.length}
      />

      <section
        id="favoris-manuels"
        className={styles.section}
        aria-labelledby="favoris-manuels-title"
      >
        <div className={styles.sectionHead}>
          <h2 id="favoris-manuels-title" className={styles.sectionTitle}>
            Favoris
          </h2>
        </div>
        <p className={styles.sectionIntro}>
          {hasManual
            ? `${manualProducts.length} produit${manualProducts.length > 1 ? 's' : ''} ajouté${manualProducts.length > 1 ? 's' : ''} avec ♥ dans le catalogue.`
            : 'Aucun favori pour le moment.'}
        </p>

        {hasManual ? (
          <ProductList products={manualProducts} showSupplier />
        ) : (
          <div className={styles.sectionEmpty}>
            <p className={styles.sectionEmptyIcon} aria-hidden>♡</p>
            <p className={styles.sectionEmptyText}>
              Dans le catalogue, cliquez sur <strong>♥</strong> à côté d&apos;un produit pour le retrouver ici.
            </p>
            <Link href="/commandes" locale={locale as 'fr' | 'en'} className={styles.sectionEmptyLink}>
              Ouvrir le catalogue
            </Link>
          </div>
        )}
      </section>

      <section
        id="favoris-habituels"
        className={styles.section}
        aria-labelledby="favoris-habituels-title"
      >
        <div className={styles.sectionHead}>
          <h2 id="favoris-habituels-title" className={styles.sectionTitle}>
            Vos habituels
          </h2>
        </div>
        <p className={styles.sectionIntro}>
          {hasSuggestions
            ? `${suggestionProducts.length} produit${suggestionProducts.length > 1 ? 's' : ''} proposé${suggestionProducts.length > 1 ? 's' : ''} d'après vos commandes passées. Cliquez sur ♥ pour les garder en favori.`
            : 'Aucun produit habituel pour le moment.'}
        </p>

        {hasSuggestions ? (
          <ProductList products={suggestionProducts} showSupplier />
        ) : (
          <div className={`${styles.sectionEmpty} ${styles.sectionEmptyHabitual}`}>
            <p className={styles.sectionEmptyText}>
              Commandez un produit <strong>au moins 2 fois</strong> pour qu&apos;il s&apos;affiche ici automatiquement.
            </p>
            <p className={styles.sectionEmptySubtext}>
              Les quantités reprennent vos dernières commandes lorsque vous les mettez au panier.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
