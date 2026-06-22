import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMesFavorisPageData } from '@/lib/supabase/wishlist'
import { getProfile } from '@/lib/supabase/auth'
import { canAccessCatalog } from '@/lib/members/profile'
import { getLastOrderedQuantities } from '@/lib/wishlist/last-ordered-quantities'
import { redirect } from 'next/navigation'
import ProductList from '@/components/catalogue/ProductList'
import WishlistBulkAdd from '@/components/wishlist/WishlistBulkAdd'
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
  const isEmpty = !hasManual && !hasSuggestions

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
        Vos produits choisis et vos habitudes de commande, à retrouver en un clic.
      </p>

      {isEmpty ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyIcon} aria-hidden>♡</p>
          <h2 className={styles.emptyTitle}>Aucun favori pour le moment</h2>
          <p className={styles.emptyText}>
            Parcourez le catalogue et cliquez sur le cœur d&apos;un produit pour le retrouver ici.
            Vos produits les plus commandés apparaîtront aussi dans « Vos habituels ».
          </p>
          <Link href="/commandes" locale={locale as 'fr' | 'en'} className={styles.ctaPrimary}>
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <>
          {!isEmpty && allProducts.length > 0 && (
            <WishlistBulkAdd
              products={allProducts}
              lastQuantities={lastQuantities}
              locale={locale as 'fr' | 'en'}
            />
          )}

          {hasManual && (
            <section className={styles.section} aria-labelledby="favoris-manuels">
              <h2 id="favoris-manuels" className={styles.sectionTitle}>
                Mes favoris
              </h2>
              <p className={styles.sectionIntro}>
                {manualProducts.length} produit{manualProducts.length > 1 ? 's' : ''} que vous avez choisi{manualProducts.length > 1 ? 's' : ''} avec le cœur.
              </p>
              <ProductList products={manualProducts} showSupplier />
            </section>
          )}

          {hasSuggestions && (
            <section className={styles.section} aria-labelledby="favoris-habituels">
              <h2 id="favoris-habituels" className={styles.sectionTitle}>
                Vos habituels
              </h2>
              <p className={styles.sectionIntro}>
                {suggestionProducts.length} produit{suggestionProducts.length > 1 ? 's' : ''} issu{suggestionProducts.length > 1 ? 's' : ''} de votre historique de commandes.
              </p>
              <ProductList products={suggestionProducts} showSupplier />
            </section>
          )}

          {!hasManual && hasSuggestions && (
            <p className={styles.hintOnlyHabituels}>
              Cliquez sur le cœur d&apos;un produit pour l&apos;ajouter à « Mes favoris ».
            </p>
          )}
        </>
      )}
    </div>
  )
}
