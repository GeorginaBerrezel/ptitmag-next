import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'
import type { OrderLineForEmail } from '@/lib/orders/close-order'

type Params = {
  memberEmail: string
  memberName?: string | null
  supplierName: string
  items: OrderLineForEmail[]
  grossTotal: number
  creditApplied: number
  total: number
}

export async function sendOrderClosed(params: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — email de clôture non envoyé.')
    return
  }

  const {
    memberEmail,
    memberName,
    supplierName,
    items,
    grossTotal,
    creditApplied,
    total,
  } = params

  const displayName = memberName ?? memberEmail
  const now = new Date().toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const rows = items
    .map(
      item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity} ${item.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">CHF ${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">CHF ${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  const creditBlock =
    creditApplied > 0
      ? `<tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;color:#2e7d32;font-weight:600;">Avoir appliqué</td>
          <td style="padding:8px 12px;text-align:right;color:#2e7d32;font-weight:600;">− CHF ${creditApplied.toFixed(2)}</td>
        </tr>`
      : ''

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;">
      <h2 style="color:#2e7d32;margin:0 0 0.5rem;">Commande clôturée — ${site.name}</h2>
      <p style="margin:0 0 1rem;opacity:0.75;">${now}</p>
      <p>Bonjour ${displayName},</p>
      <p>Votre commande <strong>${supplierName}</strong> est maintenant <strong>clôturée</strong>. Voici le récapitulatif définitif :</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:1rem 0;">
        <thead>
          <tr style="background:#f6f8fb;">
            <th style="padding:8px 12px;text-align:left;">Produit</th>
            <th style="padding:8px 12px;">Qté</th>
            <th style="padding:8px 12px;text-align:right;">P.U.</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px 12px;text-align:right;font-weight:600;">Sous-total</td>
            <td style="padding:8px 12px;text-align:right;font-weight:600;">CHF ${grossTotal.toFixed(2)}</td>
          </tr>
          ${creditBlock}
          <tr>
            <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;">Total à payer</td>
            <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;">CHF ${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="font-size:13px;opacity:0.7;">Cette commande ne peut plus être modifiée. Pour toute question, contactez l&apos;équipe du p&apos;tit mag.</p>
    </div>`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: memberEmail,
    subject: `Commande clôturée — ${supplierName} — ${site.name}`,
    html,
  })
}
