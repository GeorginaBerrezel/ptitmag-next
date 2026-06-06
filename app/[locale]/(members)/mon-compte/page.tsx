import { getProfile, getMyOrders } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'
import { Suspense } from 'react'
import ProfileHeader from './ProfileHeader'
import AccountSessionSection from './AccountSessionSection'
import styles from './mon-compte.module.css'
import CompteConfirmeBanner from '@/components/CompteConfirmeBanner'
import MyOrdersSection from './MyOrdersSection'
import MemberStatusGuide from '@/components/MemberStatusGuide'
import { formatCotisation, applyCielMarkup, canAccessCatalog, getMemberStatusDisplay, hasTerrePricing } from '@/lib/members/profile'
import { formatCreditChf } from '@/lib/members/credit'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonComptePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [profile, orders] = await Promise.all([getProfile(), getMyOrders()])

  const memberStatus = getMemberStatusDisplay(profile?.status)
  const hasCatalogAccess = profile ? canAccessCatalog(profile) : false
  const showCielMarkup = profile ? applyCielMarkup(profile) : false
  const showTerrePricing = profile ? hasTerrePricing(profile) : false
  const showCotisation =
    profile?.status === 'ciel' ||
    profile?.status === 'terre' ||
    profile?.status === 'member' ||
    (profile?.cotisation_amount != null && profile.cotisation_amount > 0)
  const creditBalance = Number(profile?.credit_balance) || 0

  return (
    <div className={`container ${styles.page}`}>

      <h1 className={styles.pageTitle}>Mon compte</h1>

      <nav aria-label="Fil d'ariane" className={styles.breadcrumb}>
        <Link href="/" locale={locale as 'fr' | 'en'} className={styles.breadcrumbLink}>
          Accueil
        </Link>
        <span aria-hidden>›</span>
        <span className={styles.breadcrumbCurrent} aria-current="page">Mon compte</span>
      </nav>

      <div className={styles.grid}>

        <Suspense fallback={null}>
          <CompteConfirmeBanner />
        </Suspense>

        {!hasCatalogAccess && (
          <>
            <div className={styles.pendingBanner}>
              <strong>Adhésion en attente.</strong> Joel validera votre statut membre
              avant l&apos;accès au catalogue. Vous recevrez un <strong>e-mail</strong> dès que
              votre adhésion sera activée. Il peut aussi vous contacter via le téléphone
              ou l&apos;e-mail indiqués à l&apos;inscription si besoin.
            </div>
            <MemberStatusGuide locale={locale} linkToMembership />
          </>
        )}

        {/* ── Profil ── */}
        {/* ProfileHeader gère l'avatar + pseudo éditable */}
        <ProfileHeader profile={profile} />

        {/* Barre d'info compacte : statut + email + bouton commander */}
        <div className={styles.statusBar}>
          <span
            className={styles.badge}
            style={{ background: memberStatus.bg, color: memberStatus.color }}
          >
            {memberStatus.label}
          </span>

          {showCielMarkup && hasCatalogAccess && (
            <span className={`${styles.badge} ${styles.badgeCiel}`}>
              +20&nbsp;% sur le catalogue
            </span>
          )}

          {showTerrePricing && hasCatalogAccess && !showCielMarkup && (
            <span className={`${styles.badge} ${styles.badgeTerre}`}>
              Prix juste — sans marge
            </span>
          )}

          {profile?.email && (
            <span className={styles.meta}>
              ✉ {profile.email}
            </span>
          )}

          {showCotisation && (
            <span className={styles.meta} style={{ whiteSpace: 'nowrap' }}>
              Cotisation : {formatCotisation(profile?.cotisation_amount)}
              {profile?.cotisation_active ? ' (active)' : profile?.cotisation_amount ? ' (inactive)' : ''}
            </span>
          )}

          {hasCatalogAccess && (
            <Link href="/commandes" className={styles.orderBtn}>
              + Commander
            </Link>
          )}
        </div>

        {creditBalance > 0 ? (
          <div className={styles.creditPositive}>
            <strong>Avoir disponible :</strong> {formatCreditChf(creditBalance)}
            <span className={styles.creditSub}>
              Déduit automatiquement au panier ou à la clôture de votre commande.
            </span>
          </div>
        ) : (
          <div className={styles.creditNeutral}>
            <strong>Pas d&apos;avoir</strong> sur votre compte pour le moment.
            <span className={styles.creditSub}>
              L&apos;équipe du magasin peut en ajouter un si besoin (remboursement, geste commercial…).
            </span>
          </div>
        )}

        {/* ── Mes commandes ── */}
        <MyOrdersSection orders={orders} hasCatalogAccess={hasCatalogAccess} />

        <AccountSessionSection locale={locale} />

      </div>
    </div>
  )
}
