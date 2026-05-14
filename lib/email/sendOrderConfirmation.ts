import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'

export type OrderEmailItem = {
  productName: string
  quantity: number
  unit: string
  unitPrice: number
}

export type OrderEmailGroup = {
  orderId: string
  supplierName: string
  supplierType: string
  items: OrderEmailItem[]
  total: number
}

type Params = {
  memberEmail: string
  memberName?: string | null
  orders: OrderEmailGroup[]
  globalTotal: number
}

const TYPE_LABELS: Record<string, string> = {
  local: 'Producteur local',
  grossiste_bio: 'Grossiste bio',
  autre: 'Autre',
}

export async function sendOrderConfirmation({
  memberEmail,
  memberName,
  orders,
  globalTotal,
}: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — email de confirmation non envoyé.')
    return
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? site.email
  const displayName = memberName ?? memberEmail
  const now = new Date().toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const html = buildHtml({ displayName, orders, globalTotal, date: now })

  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: memberEmail,
    bcc: adminEmail,
    subject: `Confirmation de commande — ${site.name} (${now})`,
    html,
  })
}

// ---------------------------------------------------------------------------
// Template HTML
// ---------------------------------------------------------------------------

function buildHtml({
  displayName,
  orders,
  globalTotal,
  date,
}: {
  displayName: string
  orders: OrderEmailGroup[]
  globalTotal: number
  date: string
}): string {
  const orderRows = orders
    .map((group) => {
      const itemRows = group.items
        .map(
          (item) => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${item.productName}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity} ${item.unit}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">CHF ${item.unitPrice.toFixed(2)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">CHF ${(item.quantity * item.unitPrice).toFixed(2)}</td>
          </tr>`
        )
        .join('')

      const typeLabel = TYPE_LABELS[group.supplierType] ?? group.supplierType

      return `
        <div style="margin-bottom:24px;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
          <div style="background:#f5f5f5;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;font-size:15px;">${group.supplierName}</span>
            <span style="font-size:13px;color:#666;">${typeLabel}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding:8px 12px;text-align:left;color:#555;font-weight:600;">Produit</th>
                <th style="padding:8px 12px;text-align:center;color:#555;font-weight:600;">Qté</th>
                <th style="padding:8px 12px;text-align:right;color:#555;font-weight:600;">Prix unit.</th>
                <th style="padding:8px 12px;text-align:right;color:#555;font-weight:600;">Sous-total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="background:#f5f5f5;">
                <td colspan="3" style="padding:8px 12px;font-weight:700;text-align:right;">Total fournisseur</td>
                <td style="padding:8px 12px;font-weight:700;text-align:right;color:#1a1a2e;">CHF ${group.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Confirmation de commande</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9f9f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${site.name}</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.65);">${site.address.full}</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#DC7F00;">Confirmation de commande</p>
              <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;">Merci, ${displayName} !</h1>
              <p style="margin:0;font-size:14px;color:#666;">Votre commande du <strong>${date}</strong> a bien été enregistrée.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 32px;">
              ${orderRows}

              <!-- Global total -->
              <div style="background:#1a1a2e;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <span style="color:#fff;font-size:15px;font-weight:600;">Total global</span>
                <span style="color:#fff;font-size:20px;font-weight:700;">CHF ${globalTotal.toFixed(2)}</span>
              </div>

              <p style="margin:24px 0 0;font-size:14px;color:#555;line-height:1.6;">
                L'équipe du p'tit mag vous contactera pour confirmer les détails et organiser la récupération de votre commande.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e8e8e8;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                ${site.name} · ${site.address.full}<br />
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
}
