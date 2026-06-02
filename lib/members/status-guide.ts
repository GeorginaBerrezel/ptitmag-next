/** Textes explicatifs Ciel / Terre / Non membre — source unique pour le site et l'admin. */

export type MemberStatusKey = 'non_membre' | 'ciel' | 'terre'

export type StatusGuideEntry = {
  emoji: string
  name: string
  tagline: string
  body: string
  cotisationHint: string
}

export type StatusGuideLocale = {
  statuses: Record<MemberStatusKey, StatusGuideEntry>
  twoStatusesTitle: string
  learnMoreLink: string
}

const FR: StatusGuideLocale = {
  twoStatusesTitle: 'Les deux statuts membres',
  learnMoreLink: 'En savoir plus sur l\'adhésion →',
  statuses: {
    non_membre: {
      emoji: '⏳',
      name: 'Non membre',
      tagline: 'En attente de validation',
      body: 'Compte créé, sans accès au catalogue. Joel valide votre adhésion et vous attribue un statut membre.',
      cotisationHint: '',
    },
    terre: {
      emoji: '🌍',
      name: 'Membre Terre',
      tagline: 'Prix juste — sans marge',
      body: 'Accès au catalogue aux prix d\'achat, sans marge commerciale. Statut des adhérent·es qui cotisent mensuellement à l\'association.',
      cotisationHint: 'Cotisation mensuelle adaptée à votre situation (repères CHF 30 ou CHF 15 solidaire), enregistrée dans votre fiche membre.',
    },
    ciel: {
      emoji: '☁️',
      name: 'Membre Ciel',
      tagline: '+20 % de marge sur le catalogue',
      body: 'Accès au catalogue avec une majoration de 20 % (marge) sur les produits. Statut pour une cotisation annuelle légère, adaptée à votre situation.',
      cotisationHint: 'Cotisation annuelle légère — montant convenu avec l\'association.',
    },
  },
}

const EN: StatusGuideLocale = {
  twoStatusesTitle: 'The two member statuses',
  learnMoreLink: 'Learn more about membership →',
  statuses: {
    non_membre: {
      emoji: '⏳',
      name: 'Non-member',
      tagline: 'Pending validation',
      body: 'Account created, no catalogue access yet. Joel validates your membership and assigns a member status.',
      cotisationHint: '',
    },
    terre: {
      emoji: '🌍',
      name: 'Earth member',
      tagline: 'Fair price — no markup',
      body: 'Catalogue access at purchase price, with no commercial markup. For members who pay a monthly contribution.',
      cotisationHint: 'Monthly contribution adapted to your situation (guidelines CHF 30 or CHF 15 reduced rate), recorded in your profile.',
    },
    ciel: {
      emoji: '☁️',
      name: 'Sky member',
      tagline: '+20% markup on the catalogue',
      body: 'Catalogue access with a 20% markup on products. For members with a light annual contribution, adapted to your situation.',
      cotisationHint: 'Light annual contribution — amount agreed with the association.',
    },
  },
}

export function getStatusGuide(locale = 'fr'): StatusGuideLocale {
  return locale === 'en' ? EN : FR
}

/** @deprecated Préférer getStatusGuide(locale).statuses */
export const MEMBER_STATUS_GUIDE = FR.statuses

/** Rappel condensé pour Joel dans l'admin. */
export const ADMIN_MEMBER_STATUS_REMINDER = [
  'Non membre → pas d\'accès catalogue (nouvelle inscription).',
  'Terre → prix juste (sans marge) · cotisation mensuelle.',
  'Ciel → +20 % sur le catalogue · cotisation annuelle.',
  'Un e-mail est envoyé automatiquement à l\'adhérent·e quand vous activez ou modifiez un statut Ciel/Terre.',
] as const

export function getCotisationHint(status: string, locale = 'fr'): string {
  const guide = getStatusGuide(locale).statuses
  if (status === 'ciel') return guide.ciel.cotisationHint
  if (status === 'terre') return guide.terre.cotisationHint
  return locale === 'en'
    ? 'Assign Sky or Earth status to open catalogue access.'
    : 'Accorde le statut Ciel ou Terre pour ouvrir l\'accès au catalogue.'
}
