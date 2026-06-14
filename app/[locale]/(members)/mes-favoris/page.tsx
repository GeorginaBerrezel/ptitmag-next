import { Link } from '@/i18n/navigation'
import { getWishlistProducts } from '@/lib/supabase/wishlist'
import { getProfile } from '@/lib/supabase/auth'
import { canAccessCatalog } from '@/lib/members/profile'
import { redirect } from 'next/navigation'
import ProductList from '@/components/catalogue/ProductList'
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

  const products = await getWishlistProducts()

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
        Vos produits habituels, à retrouver en un clic.
      </p>

      {products.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyIcon} aria-hidden>♡</p>
          <h2 className={styles.emptyTitle}>Aucun favori pour le moment</h2>
          <p className={styles.emptyText}>
            Parcourez le catalogue et cliquez sur le cœur d&apos;un produit pour le retrouver ici plus tard.
          </p>
          <Link href="/commandes" locale={locale as 'fr' | 'en'} className={styles.ctaPrimary}>
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <>
          <p className={styles.countNote}>
            {products.length} produit{products.length > 1 ? 's' : ''} en favori
          </p>
          <ProductList products={products} showSupplier />
        </>
      )}
    </div>
  )
}
