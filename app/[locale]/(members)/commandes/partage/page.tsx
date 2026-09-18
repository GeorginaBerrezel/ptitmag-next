import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { WaitingSharePools } from '@/components/sharing/SharingPrototype'
import { isShareEnabled } from '@/lib/sharing/eligibility'
import { canAccessCatalog } from '@/lib/members/profile'
import { getProfile, getUser } from '@/lib/supabase/auth'
import styles from './partage.module.css'

export const dynamic = 'force-dynamic'

export default async function PartagePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const user = await getUser()
  const profile = await getProfile()
  if (!isShareEnabled() || !user || !profile || !canAccessCatalog(profile)) notFound()

  const { locale } = await params
  const t = await getTranslations('sharing')

  return (
    <div className="catalogue-page-root" style={{ marginTop: 'calc(-1 * 1rem)' }}>
    <div className={`container ${styles.page}`}>
      <nav aria-label={t('breadcrumbAria')} className={styles.breadcrumb}>
        <Link href="/commandes" locale={locale}>{t('catalogue')}</Link>
        <span aria-hidden>›</span>
        <span>{t('title')}</span>
      </nav>

      <div className="catalogue-page-head">
        <h1>{t('title')}</h1>
        <p className="catalogue-page-sub">
          {t('subtitle')}
        </p>
      </div>

      <WaitingSharePools />
    </div>
    </div>
  )
}
