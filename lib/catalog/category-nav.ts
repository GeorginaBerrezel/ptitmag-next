/**
 * Navigation catégories catalogue :
 * - Beaucoup de catégories → grille seule pour choisir, puis « Changer de catégorie » en vue produits.
 * - Peu de catégories → barre horizontale (scroll + flèches) en vue produits pour changer sans revenir en arrière.
 */
export const COMPACT_CATEGORY_NAV_MAX = 10

export function useCompactCategoryNav(categoryCount: number): boolean {
  return categoryCount > 1 && categoryCount <= COMPACT_CATEGORY_NAV_MAX
}

export function useCategoryGridBackNav(categoryCount: number): boolean {
  return categoryCount > COMPACT_CATEGORY_NAV_MAX
}
