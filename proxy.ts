import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

const handleI18nRouting = createIntlMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
})

export async function proxy(request: NextRequest) {
  // 1. Routing des locales (redirige / → /fr, gère FR|EN)
  const response = handleI18nRouting(request)

  // 2. Rafraîchissement de la session Supabase
  // Les cookies sont appliqués à la réponse déjà construite par next-intl.
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

  // Ne pas écrire de logique entre createServerClient et getUser()
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
