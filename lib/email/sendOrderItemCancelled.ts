import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'

export type RemainingOrderItem = {
  productName: string
  quantity: number
  unit: string
  unitPrice: number
}

type Params = {
  memberEmail: string
  memberName?: string | null
  supplierName: string
  removedProductName: string
  removedQuantity: number
  removedUnit: string
  removedLineTotal: number
  remainingItems: RemainingOrderItem[]
  newTotal: number
  orderFullyCancelled: boolean
}

export async function sendOrderItemCancelled(params: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — notification modification commande non envoyée.')
    return
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? site.email
  const displayName = params.memberName ?? params.memberEmail
  const now = new Date().toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const memberSubject = params.orderFullyCancelled
    ? `Commande annulée — ${params.supplierName} — ${site.name}`
    : `Commande modifiée — ${params.supplierName} — ${site.name}`
  const adminSubject = params.orderFullyCancelled
    ? `Commande annulée — ${displayName} — ${params.supplierName} — (${now})`
    : `Commande modifiée — ${displayName} — ${params.supplierName} — (${now})`

  const html = buildHtml({ ...params, displayName, date: now })
  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: params.memberEmail,
    subject: memberSubject,
    html,
  })

  const adminCopyTo = adminEmail.trim().toLowerCase()
  const memberCopyTo = params.memberEmail.trim().toLowerCase()
  if (adminCopyTo && adminCopyTo !== memberCopyTo) {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: adminSubject,
      html,
    })
  }
}

function buildHtml({
  displayName,
  supplierName,
  removedProductName,
  removedQuantity,
  removedUnit,
  removedLineTotal,
  remainingItems,
  newTotal,
  orderFullyCancelled,
  date,
}: Params & { displayName: string; date: string }): string {
  const removedRow = `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #fdecea;color:#c0392b;text-decoration:line-through;">
        ${removedProductName}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #fdecea;text-align:center;color:#c0392b;text-decoration:line-through;">
        ${removedQuantity} ${removedUnit}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #fdecea;text-align:right;color:#c0392b;text-decoration:line-through;font-weight:600;">
        CHF ${removedLineTotal.toFixed(2)}
      </td>
    </tr>`

  const remainingRows = remainingItems
    .map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity} ${item.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">CHF ${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>`)
    .join('')

  const intro = orderFullyCancelled
    ? `Nous sommes désolés — le dernier produit de votre commande chez <strong>${supplierName}</strong> a dû être retiré. Votre commande est donc <strong>annulée</strong>.`
    : `Un produit de votre commande chez <strong>${supplierName}</strong> n&apos;est plus disponible et a été retiré par l&apos;équipe du p&apos;tit mag. Voici votre commande mise à jour.`

  const totalBlock = orderFullyCancelled
    ? `<p style="margin:16px 0 0;font-size:15px;font-weight:700;color:#c0392b;">Commande annulée — aucun montant dû.</p>`
    : `<div style="background:#1a1a2e;border-radius:10px;padding:14px 20px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#fff;font-size:15px;font-weight:600;">Nouveau total</span>
        <span style="color:#fff;font-size:20px;font-weight:700;">CHF ${newTotal.toFixed(2)}</span>
      </div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Commande modifiée</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:24px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">${site.name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#DC7F00;">
              ${orderFullyCancelled ? 'Commande annulée' : 'Commande modifiée'}
            </p>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Bonjour ${displayName},</h1>
            <p style="margin:0;font-size:14px;color:#666;line-height:1.6;">${intro}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#888;">${date} · ${supplierName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c0392b;">Produit retiré</p>
            <table width="100%" style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
              <thead>
                <tr style="background:#fdecea;">
                  <th style="padding:8px 12px;text-align:left;">Produit</th>
                  <th style="padding:8px 12px;text-align:center;">Qté</th>
                  <th style="padding:8px 12px;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${removedRow}</tbody>
            </table>

            ${remainingItems.length > 0 ? `
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2e7d32;">Votre commande mise à jour</p>
              <table width="100%" style="border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#f5f5f5;">
                    <th style="padding:8px 12px;text-align:left;">Produit</th>
                    <th style="padding:8px 12px;text-align:center;">Qté</th>
                    <th style="padding:8px 12px;text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>${remainingRows}</tbody>
              </table>
            ` : ''}

            ${totalBlock}

            <p style="margin:24px 0 0;font-size:14px;color:#555;line-height:1.6;">
              Retrouvez le détail sur <strong>Mon compte</strong> sur le site. Pour toute question : <a href="mailto:${site.email}" style="color:#DC7F00;">${site.email}</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e8e8e8;">
            <p style="margin:0;font-size:12px;color:#999;">${site.name} · ${site.address.full}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
