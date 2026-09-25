/**
 * Navigation catégories catalogue (retours Joel) :
 * - Toujours grille de cartes (mobile et desktop), même avec beaucoup de catégories.
 * - Vue produits → pas de liste de catégories : bouton « Changer de catégorie » seulement.
 * - Fournisseur / catégorie dans l’URL (?s= &c=) pour que le retour navigateur
 *   suive la flèche, sans recharger la page Next.
 */

export const CATALOGUE_HISTORY_FLAG = 'catalogueNav'
export const CATALOGUE_RESET_EVENT = 'catalogue:reset'

export type CatalogueNav = {
  supplierId: string | null
  category: string | null
}

type CatalogueHistoryState = Record<string, unknown> & {
  [CATALOGUE_HISTORY_FLAG]: true
  s: string | null
  c: string | null
}

/** Bouton retour vers le choix de catégorie (dès qu’il y a plus d’une catégorie). */
export function useChangeCategoryBackNav(categoryCount: number): boolean {
  return categoryCount > 1
}

export function isCatalogueHistoryState(state: unknown): state is CatalogueHistoryState {
  return Boolean(state && typeof state === 'object' && CATALOGUE_HISTORY_FLAG in state)
}

export function readCatalogueNav(search: string): CatalogueNav {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  const supplierId = params.get('s')
  const category = params.get('c')
  return {
    supplierId: supplierId ? supplierId : null,
    category: category ? category : null,
  }
}

/** Garde q, ephemere, etc. N’ajoute s/c que s’ils sont remplis. */
export function withCatalogueNav(
  currentHref: string,
  supplierId: string | null,
  category: string | null,
): string {
  const url = new URL(currentHref, 'https://leptitmag.invalid')
  if (supplierId) url.searchParams.set('s', supplierId)
  else url.searchParams.delete('s')
  if (category) url.searchParams.set('c', category)
  else url.searchParams.delete('c')
  return `${url.pathname}${url.search}${url.hash}`
}

export function writeCatalogueNav(
  supplierId: string | null,
  category: string | null,
  mode: 'push' | 'replace',
) {
  const next = withCatalogueNav(window.location.href, supplierId, category)
  const prev = (window.history.state && typeof window.history.state === 'object')
    ? window.history.state as Record<string, unknown>
    : {}
  const state: CatalogueHistoryState = {
    ...prev,
    [CATALOGUE_HISTORY_FLAG]: true,
    s: supplierId,
    c: category,
  }
  if (mode === 'push') window.history.pushState(state, '', next)
  else window.history.replaceState(state, '', next)
}
