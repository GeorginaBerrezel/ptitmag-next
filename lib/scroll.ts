export const APP_SCROLL_ID = 'app-scroll'

/** Position actuelle. Sert à ne pas remonter la page après une action. */
export function readAppScrollTop(): number {
  if (typeof document === 'undefined') return 0
  return document.getElementById(APP_SCROLL_ID)?.scrollTop ?? 0
}

/** Remet la page là où elle était, y compris après le prochain affichage. */
export function restoreAppScrollTop(top: number) {
  if (typeof document === 'undefined') return
  const root = document.getElementById(APP_SCROLL_ID)
  if (!root) return
  root.scrollTop = top
  requestAnimationFrame(() => {
    root.scrollTop = top
  })
}

function getScrollRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(APP_SCROLL_ID)
}

/** Remonte le conteneur de scroll principal (et les fallbacks document). */
function scrollAllRoots() {
  if (typeof window === 'undefined') return

  const root = getScrollRoot()
  if (root) {
    root.scrollTop = 0
    root.scrollLeft = 0
  }

  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  const main = document.getElementById('main')
  if (main) main.scrollTop = 0

  if (root) {
    void root.offsetHeight
    root.scrollTop = 0
  }
}

/**
 * Remonte en haut après navigation.
 * Le scroll vit dans #app-scroll (pas window) — Next.js 16 + iOS sinon
 * restaurent l'ancienne position sur documentElement/body.
 */
export function scrollPageToTopPersistently() {
  if (typeof window === 'undefined') return

  const root = getScrollRoot()
  const prevBehavior = root?.style.scrollBehavior ?? ''
  if (root) root.style.scrollBehavior = 'auto'

  scrollAllRoots()

  requestAnimationFrame(() => {
    scrollAllRoots()
    requestAnimationFrame(scrollAllRoots)
  })

  for (const ms of [0, 100, 300]) {
    window.setTimeout(scrollAllRoots, ms)
  }

  window.setTimeout(() => {
    if (root) root.style.scrollBehavior = prevBehavior
  }, 350)
}
