import { associationFrom, createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'

type NoticeKind = 'deferred' | 'reopened' | 'cancelled'

const SUBJECT: Record<NoticeKind, string> = {
  deferred: 'Partage reporté',
  reopened: 'Partage · nouvelle date',
  cancelled: 'Partage annulé',
}

const DIGEST_SUBJECT: Record<NoticeKind, string> = {
  deferred: 'Partages reportés',
  reopened: 'Partages ouverts',
  cancelled: 'Partages annulés',
}

export async function sendShareNotice(params: {
  kind: NoticeKind
  productName: string
  supplierName: string
  body: string
  members: Array<{ email: string; name: string }>
}): Promise<void> {
  if (!isSmtpConfigured() || params.members.length === 0) return

  const transporter = createTransporter()
  const from = associationFrom()
  const subject = `${SUBJECT[params.kind]} · ${params.productName}`
  const adminEmail = process.env.ADMIN_EMAIL ?? site.email

  for (const member of params.members) {
    await transporter.sendMail({
      from,
      to: member.email,
      subject,
      html: layout(`Bonjour ${member.name},`, params.body),
    })
  }

  const who = params.members.map(m => m.name).join(', ')
  await transporter.sendMail({
    from,
    to: adminEmail,
    subject: `${subject} · ${who}`,
    html: layout('Bonjour,', `${params.body}<p style="margin:16px 0 0;">Personnes dans le partage : ${who}.</p>`),
  })
}

/** Un mail pour l’admin, même sujet qu’un récap adhérent. */
export async function sendShareAdminDigest(params: {
  kind: NoticeKind
  bodyHtml: string
}): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? site.email).trim()
  if (!email) return
  await sendShareDigest({
    kind: params.kind,
    to: { email, name: '' },
    bodyHtml: params.bodyHtml,
  })
}

/** Un mail par personne, qui liste plusieurs partages. Pas de copie admin. */
export async function sendShareDigest(params: {
  kind: NoticeKind
  to: { email: string; name: string }
  bodyHtml: string
}): Promise<void> {
  if (!isSmtpConfigured() || !params.to.email) return
  const transporter = createTransporter()
  const hello = params.to.name ? `Bonjour ${params.to.name},` : 'Bonjour,'
  await transporter.sendMail({
    from: associationFrom(),
    to: params.to.email,
    subject: `${DIGEST_SUBJECT[params.kind]} · ${site.name}`,
    html: layout(hello, params.bodyHtml),
  })
}

function layout(hello: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f9f9f9;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td align="center">
      <table role="presentation" width="560" style="max-width:560px;width:100%;background:#fff;border-radius:12px;padding:24px;">
        <tr><td>
          <p style="margin:0 0 12px;font-size:16px;">${hello}</p>
          <div style="font-size:15px;line-height:1.5;">${body}</div>
          <p style="margin:24px 0 0;font-size:13px;color:#666;">${site.name}<br>${site.address.full}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
