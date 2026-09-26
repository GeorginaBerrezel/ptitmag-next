import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'

type NoticeKind = 'deferred' | 'reopened' | 'cancelled'

const SUBJECT: Record<NoticeKind, string> = {
  deferred: 'Partage reporté',
  reopened: 'Partage · nouvelle date',
  cancelled: 'Partage annulé',
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
  const from = `"${site.name}" <${process.env.SMTP_USER}>`
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
