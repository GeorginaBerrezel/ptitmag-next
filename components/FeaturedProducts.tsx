import { getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import type { FeaturedProduct } from '@/app/api/featured-products/route'

type Props = {
  locale: 'fr' | 'en'
}

function formatDeadline(iso: string, locale: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale === 'fr' ? 'fr-CH' : 'en-GB', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

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

export default async function FeaturedProducts({ locale }: Props) {
  const t        = await getTranslations({ locale, namespace: 'featured' })
  const admin    = createAdminClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

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

  return (
    <section style={{
      background: '#fff8ed',
      borderTop: '3px solid #DC7F00',
      borderBottom: '1px solid #f0e0c8',
    }}>
      <div className="container" style={{
        paddingTop: '1.25rem',
        paddingBottom: '1.25rem',
      }}>

        {/* En-tête compact sur une ligne */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#0E1726',
            whiteSpace: 'nowrap',
          }}>
            {t('title')}
          </h2>
          <p style={{
            margin: 0,
            color: 'rgba(16,24,40,0.55)',
            fontSize: '0.85rem',
            flex: '1 1 180px',
          }}>
            {t('subtitle')}
          </p>

          {/* CTA inline — pointe sur la vue filtrée éphémères */}
          {isLoggedIn ? (
            <Link
              href="/commandes?ephemere=1"
              locale={locale}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#DC7F00',
                color: '#fff',
                padding: '0.45rem 1.1rem',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              🛒 {t('order_btn')}
            </Link>
          ) : (
            <Link
              href="/connexion"
              locale={locale}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#DC7F00',
                color: '#fff',
                padding: '0.45rem 1.1rem',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              🔐 {t('login_btn')}
            </Link>
          )}
        </div>

        {/* Cartes produits — scroll horizontal sur mobile */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin',
          scrollbarColor: '#DC7F00 transparent',
        }}>
          {groups.map((variants, gi) => {
            const first = variants[0]
            return (
              <div key={gi} style={{
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
                width: 'clamp(200px, 40vw, 260px)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Bandeau orange */}
                <div style={{
                  background: '#DC7F00',
                  color: '#fff',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  ⏳ {first.supplier_name}
                </div>

                <div style={{ padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#0E1726' }}>
                    {first.name}
                  </p>

                  {first.description && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(16,24,40,0.55)', lineHeight: 1.4 }}>
                      {first.description}
                    </p>
                  )}

                  {/* Variantes */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {variants.map(v => (
                      <span key={v.id} style={{
                        background: '#f8f9fa',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#0E1726',
                        whiteSpace: 'nowrap',
                      }}>
                        {v.unit}
                        {v.unit_price != null && (
                          <span style={{ color: '#DC7F00', marginLeft: '0.3rem' }}>
                            CHF {v.unit_price.toFixed(2)}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Deadline */}
                  {first.order_deadline && (
                    <p style={{
                      margin: 0,
                      fontSize: '0.73rem',
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

        {/* Aide pour non connectés */}
        {!isLoggedIn && (
          <p style={{
            margin: '0.75rem 0 0',
            fontSize: '0.8rem',
            color: 'rgba(16,24,40,0.45)',
          }}>
            {t('login_hint')}
          </p>
        )}

      </div>
    </section>
  )
}
