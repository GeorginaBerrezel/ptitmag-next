/**
 * Navigation catégories catalogue (retours Joel) :
 * - Beaucoup de catégories → bandeau horizontal scroll + flèches pour choisir.
 * - Vue produits → pas de liste de catégories : bouton « Changer de catégorie » seulement.
 */

/** À partir de ce nombre, la grille de cartes est remplacée par un scroll horizontal. */
export const CATEGORY_SCROLL_NAV_MIN = 9

export function useCategoryScrollNav(categoryCount: number): boolean {
  return categoryCount >= CATEGORY_SCROLL_NAV_MIN
}

/** Bouton retour vers le choix de catégorie (dès qu'il y a plus d'une catégorie). */
export function useChangeCategoryBackNav(categoryCount: number): boolean {
  return categoryCount > 1
}
