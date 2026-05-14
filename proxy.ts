import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

const handleI18nRouting = createIntlMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
})

/** Routes qui nécessitent une session active. */
const PROTECTED_PATHS = ['/mon-compte', '/commandes']

export async function proxy(request: NextRequest) {
  // 1. Routing des locales
  const response = handleI18nRouting(request)

  // 2. Rafraîchissement de la session Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 3. Protection des routes membres
  const pathname = request.nextUrl.pathname
  const isProtected = PROTECTED_PATHS.some(path =>
    pathname.includes(path)
  )

  if (isProtected && !user) {
    // Détecte la locale depuis l'URL (ex: /fr/mon-compte → fr)
    const locale = pathname.split('/')[1] ?? 'fr'
    return NextResponse.redirect(
      new URL(`/${locale}/connexion`, request.url)
    )
  }

  return response
}

export const config = {
  // Exclut /api, /auth (callback Supabase), /_next et les fichiers statiques
  matcher: ['/((?!api|auth|_next|.*\\..*).*)'],
}
