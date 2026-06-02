/** Texte affiché après inscription : rappel d’ouvrir le lien sur le bon domaine (sans « preprod » en prod). */
export function emailConfirmationSiteHint(hostname: string): string {
  const host = hostname.toLowerCase()

  if (host.includes('preprod')) {
    return 'sur preprod.leptitmag.org (version de test).'
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return 'sur ce même site (test sur votre ordinateur).'
  }

  return 'sur www.leptitmag.org (ne changez pas d’adresse web).'
}
