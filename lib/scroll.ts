export const APP_SCROLL_ID = 'app-scroll'

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
