import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'
import type { OrderLineForEmail } from '@/lib/orders/close-order'

export type ClosedOrderGroup = {
  supplierName: string
  items: OrderLineForEmail[]
  grossTotal: number
  creditApplied: number
  total: number
}

type Params = {
  memberEmail: string
  memberName?: string | null
  orders: ClosedOrderGroup[]
  globalGrossTotal: number
  globalCreditApplied: number
  globalTotal: number
}

function buildSupplierBlocks(orders: ClosedOrderGroup[]): string {
  return orders
    .map(group => {
      const rows = group.items
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

      return `
        <div style="margin-bottom:20px;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
          <div style="background:#f6f8fb;padding:10px 16px;font-weight:700;font-size:15px;">${group.supplierName}</div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#fafafa;">
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
                <td style="padding:8px 12px;text-align:right;font-weight:600;">CHF ${group.grossTotal.toFixed(2)}</td>
              </tr>
              <tr style="background:#f5f5f5;">
                <td colspan="3" style="padding:8px 12px;text-align:right;font-weight:700;">Total fournisseur</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;">CHF ${group.grossTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`
    })
    .join('')
}

/**
 * Email récapitulatif de clôture — un seul email par membre, tous fournisseurs (v2.0-a).
 */
export async function sendOrderClosed(params: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — email de clôture non envoyé.')
    return
  }

  const {
    memberEmail,
    memberName,
    orders,
    globalGrossTotal,
    globalCreditApplied,
    globalTotal,
  } = params

  if (orders.length === 0) return

  const displayName = memberName ?? memberEmail
  const multiple = orders.length > 1
  const now = new Date().toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const globalCreditBlock =
    globalCreditApplied > 0
      ? `<tr>
          <td style="padding:8px 12px;text-align:right;color:#2e7d32;font-weight:600;">Avoir total appliqué</td>
          <td style="padding:8px 12px;text-align:right;color:#2e7d32;font-weight:600;">− CHF ${globalCreditApplied.toFixed(2)}</td>
        </tr>`
      : ''

  const intro = multiple
    ? `Vos <strong>${orders.length} commandes</strong> sont maintenant <strong>clôturées</strong>. Voici le récapitulatif définitif :`
    : `Votre commande <strong>${orders[0].supplierName}</strong> est maintenant <strong>clôturée</strong>. Voici le récapitulatif définitif :`

  const subject = multiple
    ? `Commandes clôturées — ${site.name}`
    : `Commande clôturée — ${orders[0].supplierName} — ${site.name}`

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;">
      <h2 style="color:#2e7d32;margin:0 0 0.5rem;">Commande${multiple ? 's' : ''} clôturée${multiple ? 's' : ''} — ${site.name}</h2>
      <p style="margin:0 0 1rem;opacity:0.75;">${now}</p>
      <p>Bonjour ${displayName},</p>
      <p>${intro}</p>
      ${buildSupplierBlocks(orders)}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 1rem;">
        <tfoot>
          <tr>
            <td style="padding:8px 12px;text-align:right;font-weight:600;">Sous-total produits</td>
            <td style="padding:8px 12px;text-align:right;font-weight:600;width:120px;">CHF ${globalGrossTotal.toFixed(2)}</td>
          </tr>
          ${globalCreditBlock}
          <tr>
            <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;">Total à payer</td>
            <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;">CHF ${globalTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="font-size:13px;opacity:0.7;">${multiple ? 'Ces commandes ne' : 'Cette commande ne'} peut${multiple ? 'vent' : ''} plus être modifiée${multiple ? 's' : ''}. Pour toute question, contactez l&apos;équipe du p&apos;tit mag.</p>
    </div>`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: memberEmail,
    subject,
    html,
  })
}
