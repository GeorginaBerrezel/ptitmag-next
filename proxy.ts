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
  const pathname = request.nextUrl.pathname

  // 1. Routing des locales — si redirection nécessaire (/ → /fr), on l'applique directement
  const intlResponse = handleI18nRouting(request)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse
  }

  // 2. Transmet le pathname aux Server Components via un header de requête
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Recopie les cookies posés par next-intl (locale, etc.)
  intlResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie)
  })

  // 3. Rafraîchissement de la session Supabase
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

  // 4. Protection des routes membres — redirige avec ?next= pour revenir après connexion
  const isProtected = PROTECTED_PATHS.some(path => pathname.includes(path))

  if (isProtected && !user) {
    const locale = pathname.split('/')[1] ?? 'fr'
    return NextResponse.redirect(
      new URL(
        `/${locale}/connexion?next=${encodeURIComponent(pathname)}`,
        request.url
      )
    )
  }

  return response
}

export const config = {
  // Exclut /api, /auth (callback Supabase), /_next et les fichiers statiques
  matcher: ['/((?!api|auth|_next|.*\\..*).*)'],
}
