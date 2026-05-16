import { getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import type { FeaturedProduct } from '@/app/api/featured-products/route'

type Props = {
  locale: 'fr' | 'en'
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDeadline(iso: string, locale: string): string {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString(locale === 'fr' ? 'fr-CH' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const timePart = d.toLocaleTimeString(locale === 'fr' ? 'fr-CH' : 'en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
  return `${datePart} à ${timePart}`
}

// Groupe les variantes d'un même produit (même nom + même fournisseur) ensemble
function groupByProduct(products: FeaturedProduct[]): FeaturedProduct[][] {
  const groups = new Map<string, FeaturedProduct[]>()
  for (const p of products) {
    const key = `${p.supplier_name}||${p.name}`
    const arr = groups.get(key) ?? []
    arr.push(p)
    groups.set(key, arr)
  }
  return Array.from(groups.values())
}

// ─── composant ───────────────────────────────────────────────────────────────

export default async function FeaturedProducts({ locale }: Props) {
  const t  = await getTranslations({ locale, namespace: 'featured' })
  const admin  = createAdminClient()
  const supabase = await createClient()

  // Vérifie si l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Récupère les produits éphémères actifs (deadline non dépassée)
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('products')
    .select(`
      id, name, description, unit, unit_price, min_quantity, order_deadline,
      supplier:suppliers(name)
    `)
    .eq('is_featured', true)
    .eq('active', true)
    .or(`order_deadline.is.null,order_deadline.gt.${now}`)
    .order('order_deadline', { ascending: true })

  if (error || !data || data.length === 0) return null

  const products: FeaturedProduct[] = data.map((p: {
    id: string; name: string; description: string | null
    unit: string; unit_price: number | null; min_quantity: number
    order_deadline: string | null
    supplier: { name: string } | { name: string }[] | null
  }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    unit: p.unit,
    unit_price: p.unit_price,
    min_quantity: p.min_quantity,
    order_deadline: p.order_deadline,
    supplier_name: (p.supplier as unknown as { name: string } | null)?.name ?? '',
  }))

  const groups = groupByProduct(products)

  // Deadline la plus proche parmi tous les produits éphémères
  const nearestDeadline = products
    .map(p => p.order_deadline)
    .filter(Boolean)
    .sort()[0]

  return (
    <section style={{
      background: 'linear-gradient(135deg, #1a0e00 0%, #2d1a00 100%)',
      padding: 'clamp(2rem, 5vw, 3rem) 0',
      marginTop: '0',
    }}>
      <div className="container">

        {/* En-tête */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            margin: '0 0 0.4rem',
            fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
            fontWeight: 800,
            color: '#fff',
          }}>
            {t('title')}
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {t('subtitle')}
          </p>

          {/* Compte à rebours — date limite la plus proche */}
          {nearestDeadline && (
            <p style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginTop: '0.75rem',
              background: '#DC7F00',
              color: '#fff',
              padding: '0.35rem 0.85rem',
              borderRadius: 20,
              fontSize: '0.83rem',
              fontWeight: 700,
            }}>
              ⏰ {t('deadline')} {formatDeadline(nearestDeadline, locale)}
            </p>
          )}
        </div>

        {/* Grille des groupes de produits */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}>
          {groups.map((variants, gi) => {
            const first = variants[0]
            return (
              <div key={gi} style={{
                background: '#fff',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Badge éphémère */}
                <div style={{
                  background: '#DC7F00',
                  color: '#fff',
                  padding: '0.3rem 0.85rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  ⏳ Éphémère · {first.supplier_name}
                </div>

                <div style={{ padding: '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0E1726' }}>
                    {first.name}
                  </p>

                  {first.description && (
                    <p style={{ margin: 0, fontSize: '0.83rem', color: 'rgba(16,24,40,0.65)', lineHeight: 1.5 }}>
                      {first.description}
                    </p>
                  )}

                  {/* Variantes (formats / prix) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                    {variants.map(v => (
                      <span key={v.id} style={{
                        background: '#f0f4f8',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0E1726',
                        whiteSpace: 'nowrap',
                      }}>
                        {v.unit}
                        {v.unit_price != null && (
                          <span style={{ color: '#DC7F00', marginLeft: '0.35rem' }}>
                            CHF {v.unit_price.toFixed(2)}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Deadline du groupe */}
                  {first.order_deadline && (
                    <p style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: '#b45309',
                      fontWeight: 600,
                    }}>
                      ⏰ {t('deadline')} {formatDeadline(first.order_deadline, locale)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA selon état de connexion */}
        {isLoggedIn ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link
              href="/commandes"
              locale={locale}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#DC7F00',
                color: '#fff',
                padding: '0.85rem 2.25rem',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              🛒 {t('order_btn')}
            </Link>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.93rem', lineHeight: 1.55, flex: '1 1 240px' }}>
              {t('login_hint')}
            </p>
            <Link
              href="/connexion"
              locale={locale}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#DC7F00',
                color: '#fff',
                padding: '0.75rem 1.75rem',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
            >
              🔐 {t('login_btn')}
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}
