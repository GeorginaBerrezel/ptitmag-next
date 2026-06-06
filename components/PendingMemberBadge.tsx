'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import styles from './pending-member-badge.module.css'

export default function PendingMemberBadge({ locale }: { locale: 'fr' | 'en' }) {
  const t = useTranslations('nav')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setShow(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single()

      setShow(profile ? !canAccessCatalog(profile) : false)
    }

    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { check() })
    return () => subscription.unsubscribe()
  }, [])

  if (!show) return null

  return (
    <Link
      href="/mon-compte"
      locale={locale}
      className={styles.badge}
      title={t('pendingTitle')}
    >
      {t('pendingActivation')}
    </Link>
  )
}
