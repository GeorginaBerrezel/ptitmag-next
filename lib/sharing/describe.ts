import { pickCover, type CoverInput } from './cover'
import { formatShareNumber } from './from-product'

export type DescribeContribution = CoverInput & {
  displayName: string
}

export type DescribeShareInput = {
  isFull: boolean
  deferred: boolean
  remaining: number
  target: number
  unit: string
  deadlineLabel: string | null
  unitPrice: number
  viewerId: string | null
  contributions: DescribeContribution[]
}

function qty(n: number, unit: string): string {
  return `${formatShareNumber(n)} ${unit}`.trim()
}

function chf(n: number): string {
  return `CHF ${n.toFixed(2)}`
}

/** Texte de la carte : ce qui va se passer, sans demander de revenir plus tard. */
export function describeShare(input: DescribeShareInput): { headline: string; detail: string | null } {
  const when = input.deadlineLabel ? `le ${input.deadlineLabel}` : 'à la date du fournisseur'
  const yours = input.viewerId
    ? input.contributions.find(row => row.memberId === input.viewerId) ?? null
    : null

  if (input.deferred) {
    return {
      headline: 'Les commandes de ce fournisseur sont fermées. Vos parts sont gardées jusqu’à la prochaine ouverture.',
      detail: 'Aucun montant n’est dû pour l’instant. Tu peux encore modifier ta part.',
    }
  }

  if (input.isFull) {
    return {
      headline: `Complet. Chacun garde sa part. La commande part seule ${when}.`,
      detail: yours
        ? `Tu peux encore retirer ta part avant. Ensuite ce partage disparaît d’ici.`
        : null,
    }
  }

  const pick = pickCover(input.contributions, input.target)
  const named = input.contributions.find(row => row.memberId === pick?.memberId) ?? null
  const backups = input.contributions
    .filter(row => row.coverAt && row.coverMax != null && row.memberId !== pick?.memberId)
    .sort((a, b) => (a.coverAt ?? '').localeCompare(b.coverAt ?? ''))

  let headline: string
  if (named && named.coverMax != null) {
    const backupLabel = backups.map(row => row.displayName).join(', ')
    headline = `S’il manque encore des parts ${when} : ${named.displayName} les prend (jusqu’à ${qty(named.coverMax, input.unit)}).`
    if (backupLabel) headline += ` En secours : ${backupLabel}.`
  } else {
    headline = `Il manque ${qty(input.remaining, input.unit)}. Personne ne peut les prendre seul. À la date, on attend la prochaine ouverture de ce fournisseur.`
  }

  let detail: string | null = null
  if (yours?.coverMax != null && yours.coverAt) {
    const maxPay = chf(yours.coverMax * input.unitPrice)
    if (pick?.memberId === yours.memberId) {
      detail = `Tu as demandé ${qty(yours.quantity, input.unit)}. Au maximum tu recevras ${qty(yours.coverMax, input.unit)}, ${maxPay}.`
    } else {
      const ahead = named ? `${named.displayName} est devant toi. ` : ''
      detail = `Tu es en secours. ${ahead}Ton maximum est ${qty(yours.coverMax, input.unit)}, ${maxPay}.`
    }
  }

  return { headline, detail }
}
