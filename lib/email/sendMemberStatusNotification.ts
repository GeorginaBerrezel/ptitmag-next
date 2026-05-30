import { getSiteOrigin } from '@/lib/auth/urls'
import { formatCotisation } from '@/lib/members/profile'
import { getStatusGuide, type MemberStatusKey } from '@/lib/members/status-guide'
import { site } from '@/lib/site'
import { createTransporter, isSmtpConfigured } from './mailer'

type ActiveStatus = 'ciel' | 'terre'

type Params = {
  memberEmail: string
  memberName?: string | null
  oldStatus: MemberStatusKey
  newStatus: ActiveStatus
  cotisationAmount?: number | null
  cotisationActive?: boolean
  locale?: string
}

/** Envoi si activation (non membre → Ciel/Terre) ou changement Ciel ↔ Terre. */
export function shouldSendMemberStatusEmail(
  oldStatus: MemberStatusKey,
  newStatus: string,
): newStatus is ActiveStatus {
  if (oldStatus === newStatus) return false
  if (newStatus !== 'ciel' && newStatus !== 'terre') return false
  return oldStatus === 'non_membre' || oldStatus === 'ciel' || oldStatus === 'terre'
}

export async function sendMemberStatusNotification({
  memberEmail,
  memberName,
  oldStatus,
  newStatus,
  cotisationAmount,
  cotisationActive,
  locale = 'fr',
}: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — notification statut membre non envoyée.')
    return
  }

  const guide = getStatusGuide(locale)
  const statusInfo = guide.statuses[newStatus]
  const displayName = memberName?.trim() || 'cher·e adhérent·e'
  const isActivation = oldStatus === 'non_membre'
  const siteOrigin = getSiteOrigin()
  const catalogueUrl = `${siteOrigin}/fr/commandes`

  const title = isActivation
    ? (locale === 'en' ? 'Your membership is validated!' : 'Votre adhésion est validée !')
    : (locale === 'en' ? 'Your member status has been updated' : 'Votre statut membre a été mis à jour')

  const intro = isActivation
    ? (locale === 'en'
        ? `Joel has validated your membership. You are now <strong>${statusInfo.name}</strong>.`
        : `Joel a validé votre adhésion. Vous êtes désormais <strong>${statusInfo.name}</strong>.`)
    : (locale === 'en'
        ? `Your member status has changed from <strong>${guide.statuses[oldStatus as MemberStatusKey]?.name ?? oldStatus}</strong> to <strong>${statusInfo.name}</strong>.`
        : `Votre statut est passé de <strong>${guide.statuses[oldStatus as MemberStatusKey]?.name ?? oldStatus}</strong> à <strong>${statusInfo.name}</strong>.`)

  const cotisationLine = cotisationAmount != null && cotisationAmount > 0
    ? (locale === 'en'
        ? `Contribution: ${formatCotisation(cotisationAmount)}${cotisationActive ? ' (active)' : ''}.`
        : `Cotisation : ${formatCotisation(cotisationAmount)}${cotisationActive ? ' (active)' : ''}.`)
    : ''

  const ctaLabel = locale === 'en' ? 'Browse the catalogue' : 'Accéder au catalogue'

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9f9f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${site.name}</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.65);">${site.address.full}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#1565c0;">${statusInfo.emoji} ${statusInfo.name}</p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;">${title}</h1>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
                ${locale === 'en' ? 'Hello' : 'Bonjour'} <strong>${displayName}</strong>,<br/>
                ${intro}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 8px;">
              <div style="background:${newStatus === 'terre' ? '#e8f5e9' : '#e3f2fd'};border-left:4px solid ${newStatus === 'terre' ? '#2e7d32' : '#1565c0'};border-radius:0 8px 8px 0;padding:14px 16px;">
                <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:#1a1a2e;">${statusInfo.tagline}</p>
                <p style="margin:0;font-size:13px;color:#444;line-height:1.65;">${statusInfo.body}</p>
                ${statusInfo.cotisationHint ? `<p style="margin:8px 0 0;font-size:12px;color:#666;line-height:1.5;">${statusInfo.cotisationHint}</p>` : ''}
                ${cotisationLine ? `<p style="margin:8px 0 0;font-size:13px;font-weight:600;color:#1a1a2e;">${cotisationLine}</p>` : ''}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px;">
              <a href="${catalogueUrl}" style="display:inline-block;background:#DC7F00;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;">
                ${ctaLabel} →
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
                ${locale === 'en' ? 'Questions?' : 'Des questions ?'} ${locale === 'en' ? 'Contact us at' : 'Contactez-nous à'}
                <a href="mailto:${site.email}" style="color:#DC7F00;text-decoration:none;">${site.email}</a>.
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#555;">— ${locale === 'en' ? 'The p\'tit mag team' : 'L\'équipe du p\'tit mag'}</p>
            </td>
          </tr>

          <tr>
            <td style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e8e8e8;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                ${site.name} · ${site.address.full}<br/>
                <a href="mailto:${site.email}" style="color:#DC7F00;text-decoration:none;">${site.email}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const subject = isActivation
    ? `${statusInfo.emoji} ${locale === 'en' ? 'Membership validated' : 'Adhésion validée'} — ${statusInfo.name} · ${site.name}`
    : `${statusInfo.emoji} ${locale === 'en' ? 'Status updated' : 'Statut mis à jour'} — ${statusInfo.name} · ${site.name}`

  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: memberEmail,
    subject,
    html,
  })
}
