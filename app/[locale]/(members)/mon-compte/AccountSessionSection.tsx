'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { DELETE_ACCOUNT_CONFIRMATION } from '@/lib/members/delete-account'
import styles from './account-session.module.css'

export default function AccountSessionSection({ locale }: { locale: string }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = confirmation.trim() === DELETE_ACCOUNT_CONFIRMATION

  async function handleSignOut() {
    if (signOutLoading) return
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/connexion`)
    router.refresh()
  }

  async function handleDelete() {
    if (!canDelete || deleteLoading) return

    setDeleteLoading(true)
    setError(null)

    const res = await fetch('/api/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: confirmation.trim() }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'La suppression a échoué. Réessaie ou contacte-nous.')
      setDeleteLoading(false)
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  function closeDeleteFlow() {
    setDeleteOpen(false)
    setConfirmation('')
    setError(null)
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sessionCard} aria-label="Session">
        <h2 className={styles.sessionTitle}>Session</h2>
        <div className={styles.sessionRow}>
          <p className={styles.sessionHint}>
            Se déconnecter vous ramène à la page Connexion. Vos commandes et votre profil restent enregistrés.
            Vous pourrez vous reconnecter à tout moment.
          </p>
          <button
            type="button"
            className={styles.signOutBtn}
            onClick={() => void handleSignOut()}
            disabled={signOutLoading}
            aria-busy={signOutLoading}
          >
            {signOutLoading ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </section>

      <section className={styles.dangerCard} aria-label="Suppression de compte">
        <h2 className={styles.dangerTitle}>Supprimer mon compte</h2>
        <p className={styles.dangerHint}>
          <strong>Rien n&apos;est supprimé en un clic.</strong> Si vous continuez, une confirmation en deux
          étapes vous sera demandée (taper « {DELETE_ACCOUNT_CONFIRMATION} »). Vos commandes passées restent visibles pour
          l&apos;association ; vos données personnelles seront effacées.
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            className={styles.deleteTriggerBtn}
            onClick={() => setDeleteOpen(true)}
            aria-expanded={deleteOpen}
          >
            Commencer la suppression du compte…
          </button>
        ) : (
          <div className={styles.confirmPanel} role="region" aria-label="Confirmation de suppression">
            <p className={styles.confirmLabel}>
              Étape 2 : tapez <strong>{DELETE_ACCOUNT_CONFIRMATION}</strong> pour confirmer.
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              autoComplete="off"
              disabled={deleteLoading}
              className={styles.confirmInput}
              aria-label={`Confirmation : saisir ${DELETE_ACCOUNT_CONFIRMATION}`}
            />
            {error && (
              <p role="alert" className={styles.error}>{error}</p>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!canDelete || deleteLoading}
                className={`${styles.confirmDeleteBtn} ${
                  canDelete && !deleteLoading
                    ? styles.confirmDeleteBtnEnabled
                    : styles.confirmDeleteBtnDisabled
                }`}
              >
                {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
              <button
                type="button"
                onClick={closeDeleteFlow}
                disabled={deleteLoading}
                className={styles.confirmCancelBtn}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <p className={styles.contactHint}>
          Des questions ?{' '}
          <Link href="/contact" locale={locale as 'fr' | 'en'} className={styles.contactLink}>
            Contactez-nous
          </Link>
          . L&apos;équipe du magasin peut vous aider avant toute suppression.
        </p>
      </section>
    </div>
  )
}
