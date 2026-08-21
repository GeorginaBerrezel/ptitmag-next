import { Link } from '@/i18n/navigation'
import { buildAccountStatement } from '@/lib/members/account-movements'
import {
  getAccountPreview,
  isAccountPreviewMode,
  type AccountPreviewMode,
} from '@/lib/members/account-preview'
import { formatCreditChf } from '@/lib/members/credit'
import { creditEventTitle, type CreditEvent } from '@/lib/members/credit-ledger'
import type { OrderWithItems } from '@/lib/supabase/auth'
import styles from './account-movements.module.css'

type Props = {
  orders: OrderWithItems[]
  creditBalance: number
  events: CreditEvent[]
  locale: string
  previewMode?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSigned(amount: number): string {
  const abs = formatCreditChf(Math.abs(amount))
  return amount > 0 ? `+ ${abs}` : `− ${abs}`
}

export default function AccountMovementsSection({
  orders,
  creditBalance,
  events,
  locale,
  previewMode,
}: Props) {
  const preview = isAccountPreviewMode(previewMode) ? getAccountPreview(previewMode) : null
  const statement = buildAccountStatement(
    preview?.orders ?? orders,
    preview?.creditBalance ?? creditBalance,
  )
  const ledger = preview?.events ?? events
  const loc = locale as 'fr' | 'en'

  return (
    <section className={styles.section} aria-labelledby="account-avoir-title">
      <h2 id="account-avoir-title" className={styles.title}>
        Mon avoir
      </h2>
      <p className={styles.intro}>
        Crédit magasin, déduit à la clôture de vos commandes. Les paiements se font sur place.
      </p>

      {preview && (
        <div className={styles.previewBanner} role="status">
          <strong>Aperçu fictif</strong> — {preview.label}. Rien n&apos;est modifié en base.
          <span className={styles.previewLinks}>
            <PreviewLink locale={loc} mode={undefined} current={previewMode} label="Mes vraies données" />
            <PreviewLink locale={loc} mode="avoir" current={previewMode} label="Avec avoir" />
            <PreviewLink locale={loc} mode="encours" current={previewMode} label="En cours" />
            <PreviewLink locale={loc} mode="complet" current={previewMode} label="Complet" />
            <PreviewLink locale={loc} mode="vide" current={previewMode} label="Vide" />
          </span>
        </div>
      )}

      {!preview && process.env.NODE_ENV === 'development' && (
        <p className={styles.previewHint}>
          Aperçu sans toucher la base :{' '}
          <PreviewLink locale={loc} mode="avoir" current={previewMode} label="avec avoir" />
          {' · '}
          <PreviewLink locale={loc} mode="encours" current={previewMode} label="commande en cours" />
          {' · '}
          <PreviewLink locale={loc} mode="complet" current={previewMode} label="les deux" />
          {' · '}
          <PreviewLink locale={loc} mode="vide" current={previewMode} label="compte vide" />
        </p>
      )}

      <div className={styles.summary}>
        {statement.creditBalance > 0 ? (
          <div className={`${styles.summaryItem} ${styles.summaryCredit}`}>
            <span className={styles.summaryLabel}>Disponible maintenant</span>
            <span className={styles.summaryValue}>{formatCreditChf(statement.creditBalance)}</span>
            <span className={styles.summaryHint}>Déduit à la clôture de vos prochaines commandes</span>
          </div>
        ) : (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Disponible maintenant</span>
            <span className={styles.summaryQuiet}>Aucun avoir pour le moment</span>
          </div>
        )}

        {statement.inProgressCount > 0 && (
          <div className={`${styles.summaryItem} ${styles.summaryOpen}`}>
            <span className={styles.summaryLabel}>Commandes pas encore clôturées</span>
            <span className={styles.summaryValue}>{formatCreditChf(statement.inProgressGross)}</span>
            <span className={styles.summaryMeta}>
              Montant des produits, avant avoir. Détail dans Mes commandes.
            </span>
          </div>
        )}
      </div>

      {ledger.length === 0 ? (
        <p className={styles.empty}>
          Pas encore de mouvement d&apos;avoir. Le solde ci-dessus, s&apos;il y en a un,
          vient des saisies précédentes.
        </p>
      ) : (
        <details className={styles.details} open={Boolean(preview) || ledger.length <= 6}>
          <summary className={styles.summaryToggle}>
            Historique de l&apos;avoir
            <span className={styles.summaryToggleMeta}>{ledger.length}</span>
          </summary>
          <ul className={styles.list}>
            {ledger.map(item => (
              <li key={item.id} className={styles.row}>
                <span className={styles.date}>{formatDate(item.created_at)}</span>
                <div className={styles.rowMain}>
                  <span className={styles.supplier}>{creditEventTitle(item.kind)}</span>
                  {item.note && <span className={styles.creditLine}>{item.note}</span>}
                </div>
                <span className={styles.amounts}>
                  <span className={item.amount >= 0 ? styles.creditIn : styles.payable}>
                    {formatSigned(item.amount)}
                  </span>
                  <span className={styles.creditLine}>
                    solde {formatCreditChf(item.balance_after)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function PreviewLink({
  locale,
  mode,
  current,
  label,
}: {
  locale: 'fr' | 'en'
  mode: AccountPreviewMode | undefined
  current: string | undefined
  label: string
}) {
  const active = (mode ?? '') === (current ?? '')
  return (
    <Link
      href={mode ? `/mon-compte?apercu=${mode}` : '/mon-compte'}
      locale={locale}
      className={active ? styles.previewLinkActive : styles.previewLink}
    >
      {label}
    </Link>
  )
}
