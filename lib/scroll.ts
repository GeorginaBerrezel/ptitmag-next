/** Cibles possibles du scroll (Safari iOS, Firefox, Chrome). */
function scrollAllRoots() {
  if (typeof window === 'undefined') return

  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  const main = document.getElementById('main')
  if (main) main.scrollTop = 0

  // Safari iOS : forcer un reflow puis re-scroll
  void document.body.offsetHeight
  window.scrollTo(0, 0)
}

/**
 * Remonte en haut après navigation.
 * Next.js 16 peut restaurer l'ancienne position après le paint :
 * on force scroll-behavior: auto et on réessaie plusieurs fois.
 */
export function scrollPageToTopPersistently() {
  if (typeof window === 'undefined') return

  const html = document.documentElement
  const prevBehavior = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'

  scrollAllRoots()

  requestAnimationFrame(() => {
    scrollAllRoots()
    requestAnimationFrame(scrollAllRoots)
  })

  for (const ms of [0, 50, 150, 300, 500]) {
    window.setTimeout(scrollAllRoots, ms)
  }

  window.setTimeout(() => {
    html.style.scrollBehavior = prevBehavior
  }, 550)
}

/** @deprecated Utiliser scrollPageToTopPersistently */
export function scrollPageToTop() {
  scrollAllRoots()
}

/** @deprecated Utiliser scrollPageToTopPersistently */
export function scrollPageToTopAfterPaint() {
  scrollPageToTopPersistently()
}
