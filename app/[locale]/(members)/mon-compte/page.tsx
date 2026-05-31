import { getProfile, getMyOrders } from '@/lib/supabase/auth'
import { Link } from '@/i18n/navigation'
import { Suspense } from 'react'
import SignOutButton from './SignOutButton'
import ProfileHeader from './ProfileHeader'
import DeleteAccountSection from './DeleteAccountSection'
import CompteConfirmeBanner from './CompteConfirmeBanner'
import MyOrdersSection from './MyOrdersSection'
import MemberStatusGuide from '@/components/MemberStatusGuide'
import { formatCotisation, applyCielMarkup, canAccessCatalog, getMemberStatusDisplay, hasTerrePricing } from '@/lib/members/profile'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonComptePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [profile, orders] = await Promise.all([getProfile(), getMyOrders()])

  const memberStatus = getMemberStatusDisplay(profile?.status)
  const hasCatalogAccess = profile ? canAccessCatalog(profile) : false
  const showCielMarkup = profile ? applyCielMarkup(profile) : false
  const showTerrePricing = profile ? hasTerrePricing(profile) : false
  const showCotisation =
    profile?.status === 'ciel' ||
    profile?.status === 'terre' ||
    profile?.status === 'member' ||
    (profile?.cotisation_amount != null && profile.cotisation_amount > 0)

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: 700 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', color: 'rgba(16,24,40,0.4)', marginBottom: '1.5rem',
      }}>
        <span>Accueil</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Mon compte</span>
      </nav>

      <div style={{ display: 'grid', gap: '1rem' }}>

        <Suspense fallback={null}>
          <CompteConfirmeBanner />
        </Suspense>

        {!hasCatalogAccess && (
          <>
            <div style={{
              background: '#f0f7ff',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              padding: '1rem 1.15rem',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: '#1e3a5f',
            }}>
              <strong>Adhésion en attente.</strong> Joel validera votre statut membre
              avant l&apos;accès au catalogue. Vous recevrez un <strong>e-mail</strong> dès que
              votre adhésion sera activée. Il peut aussi vous contacter via le téléphone
              ou l&apos;e-mail indiqués à l&apos;inscription si besoin.
            </div>
            <MemberStatusGuide locale={locale} linkToMembership />
          </>
        )}

        {/* ── Profil ── */}
        {/* ProfileHeader gère l'avatar + pseudo éditable */}
        <ProfileHeader profile={profile} />

        {/* Barre d'info compacte : statut + email + bouton commander */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(16,24,40,0.08)',
          borderRadius: 14,
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          {/* Badge statut */}
          <span style={{
            background: memberStatus.bg,
            color: memberStatus.color,
            borderRadius: 999,
            padding: '0.2rem 0.75rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            {memberStatus.label}
          </span>

          {showCielMarkup && hasCatalogAccess && (
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#4338ca',
              background: '#eef2ff',
              borderRadius: 999,
              padding: '0.2rem 0.75rem',
              whiteSpace: 'nowrap',
            }}>
              +20&nbsp;% sur le catalogue
            </span>
          )}

          {showTerrePricing && hasCatalogAccess && !showCielMarkup && (
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#2e7d32',
              background: '#e8f5e9',
              borderRadius: 999,
              padding: '0.2rem 0.75rem',
              whiteSpace: 'nowrap',
            }}>
              Prix juste — sans marge
            </span>
          )}

          {/* Email */}
          {profile?.email && (
            <span style={{ fontSize: '0.83rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ✉ {profile.email}
            </span>
          )}

          {showCotisation && (
            <span style={{ fontSize: '0.83rem', opacity: 0.55, whiteSpace: 'nowrap' }}>
              Cotisation : {formatCotisation(profile?.cotisation_amount)}
              {profile?.cotisation_active ? ' (active)' : profile?.cotisation_amount ? ' (inactive)' : ''}
            </span>
          )}

          {hasCatalogAccess && (
          <Link
            href="/commandes"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#DC7F00',
              color: '#fff',
              borderRadius: 8,
              padding: '0.4rem 1rem',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
          >
            + Commander
          </Link>
          )}
        </div>

        {/* ── Mes commandes ── */}
        <MyOrdersSection orders={orders} hasCatalogAccess={hasCatalogAccess} />

        {/* Déconnexion + suppression de compte */}
        <div style={{ marginTop: '0.5rem' }}>
          <SignOutButton />
          <DeleteAccountSection locale={locale} />
        </div>

      </div>
    </div>
  )
}
