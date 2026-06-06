/**
 * Navigation catégories catalogue (retours Joel) :
 * - Desktop : grille de cartes (même avec beaucoup de catégories).
 * - Mobile : scroll horizontal si beaucoup de catégories.
 * - Vue produits → pas de liste de catégories : bouton « Changer de catégorie » seulement.
 */

/** À partir de ce nombre, le mobile passe en scroll horizontal (desktop reste en cartes). */
export const CATEGORY_SCROLL_NAV_MIN = 9

/** Aligné sur le breakpoint catalogue mobile (styles/pages.css). */
export const CATEGORY_SCROLL_NAV_MAX_WIDTH_PX = 719

export function useCategoryScrollNav(categoryCount: number, isMobileViewport: boolean): boolean {
  return isMobileViewport && categoryCount >= CATEGORY_SCROLL_NAV_MIN
}

/** Bouton retour vers le choix de catégorie (dès qu'il y a plus d'une catégorie). */
export function useChangeCategoryBackNav(categoryCount: number): boolean {
  return categoryCount > 1
}
