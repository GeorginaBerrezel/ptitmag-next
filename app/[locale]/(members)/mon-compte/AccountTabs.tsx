'use client'

import { useState, type ReactNode } from 'react'
import Avatar from '@/components/Avatar'
import { APP_SCROLL_ID } from '@/lib/scroll'
import styles from './account-tabs.module.css'

export type AccountTabId = 'commandes' | 'profil'

type Props = {
  ordersPanel: ReactNode
  profilePanel: ReactNode
  ordersCount?: number
  firstName?: string | null
  fullName?: string | null
  username?: string | null
  email?: string | null
  avatarUrl?: string | null
  userId?: string | null
}

export function accountGreetingName(parts: {
  firstName?: string | null
  fullName?: string | null
  username?: string | null
}): string | null {
  const pseudo = parts.username?.trim()
  if (pseudo) return pseudo
  const first = parts.firstName?.trim()
  if (first) return first
  const fromFull = parts.fullName?.trim().split(/\s+/)[0]
  if (fromFull) return fromFull
  return null
}

function scrollAccountToTabs() {
  const root = document.getElementById(APP_SCROLL_ID)
  if (root) root.scrollTop = 0
}

export default function AccountTabs({
  ordersPanel,
  profilePanel,
  ordersCount = 0,
  firstName,
  fullName,
  username,
  email,
  avatarUrl,
  userId,
}: Props) {
  const [tab, setTab] = useState<AccountTabId>('commandes')
  const greeting = accountGreetingName({ firstName, fullName, username })

  function switchTab(next: AccountTabId) {
    setTab(next)
    scrollAccountToTabs()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h1 className={styles.title}>
          <span className="sr-only">Mon compte. </span>
          {greeting ? `Salut ${greeting}` : 'Mon compte'}
        </h1>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => switchTab('profil')}
          aria-label="Ouvrir l’onglet Profil"
        >
          <Avatar
            src={avatarUrl}
            name={fullName ?? username}
            email={email}
            userId={userId}
            size={40}
          />
        </button>
      </div>

      <div className={styles.tablist} role="tablist" aria-label="Sections du compte">
        <button
          type="button"
          role="tab"
          id="account-tab-commandes"
          aria-controls="account-panel-commandes"
          aria-selected={tab === 'commandes'}
          className={tab === 'commandes' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => switchTab('commandes')}
        >
          <span>Mes commandes</span>
          {ordersCount > 0 && <span className={styles.count}>{ordersCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="account-tab-profil"
          aria-controls="account-panel-profil"
          aria-selected={tab === 'profil'}
          className={tab === 'profil' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => switchTab('profil')}
        >
          Profil
        </button>
      </div>

      <div
        id="account-panel-commandes"
        role="tabpanel"
        aria-labelledby="account-tab-commandes"
        hidden={tab !== 'commandes'}
      >
        <div className={styles.panel}>{ordersPanel}</div>
      </div>

      <div
        id="account-panel-profil"
        role="tabpanel"
        aria-labelledby="account-tab-profil"
        hidden={tab !== 'profil'}
      >
        <div className={styles.panel}>{profilePanel}</div>
      </div>
    </div>
  )
}
