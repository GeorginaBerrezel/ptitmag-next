/**
 * Navigation catégories catalogue (retours Joel) :
 * - Toujours grille de cartes (mobile et desktop), même avec beaucoup de catégories.
 * - Vue produits → pas de liste de catégories : bouton « Changer de catégorie » seulement.
 */

/** Bouton retour vers le choix de catégorie (dès qu'il y a plus d'une catégorie). */
export function useChangeCategoryBackNav(categoryCount: number): boolean {
  return categoryCount > 1
}
