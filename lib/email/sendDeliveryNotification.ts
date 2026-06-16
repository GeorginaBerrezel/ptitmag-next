import { createTransporter, isSmtpConfigured } from './mailer'
import { site } from '@/lib/site'
import { formatOpeningHoursHtml } from '@/lib/site/opening-hours'

export type DeliveryItem = {
  productName: string
  quantity: number
  unit: string
  unitPrice: number
}

export type DeliveryOrderGroup = {
  supplierName: string
  items: DeliveryItem[]
  total: number
}

type Params = {
  memberEmail: string
  memberName?: string | null
  orders: DeliveryOrderGroup[]
  globalTotal: number
}

function buildSupplierBlocks(orders: DeliveryOrderGroup[]): string {
  return orders
    .map(group => {
      const itemRows = group.items
        .map(
          item => `
      <tr>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${item.productName}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center;">${item.quantity}&nbsp;${item.unit}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600;">CHF&nbsp;${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>`,
        )
        .join('')

      return `
              <div style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;margin-bottom:16px;">
                <div style="background:#f5f5f5;padding:10px 16px;">
                  <span style="font-weight:700;font-size:15px;">${group.supplierName}</span>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="background:#fafafa;">
                      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600;">Produit</th>
                      <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;">Qté</th>
                      <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;font-weight:600;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                  <tfoot>
                    <tr style="background:#f5f5f5;">
                      <td colspan="2" style="padding:8px 12px;font-weight:700;font-size:13px;text-align:right;">Sous-total</td>
                      <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;">CHF&nbsp;${group.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
    })
    .join('')
}

/**
 * Envoie un email à l'adhérent pour l'informer que ses commandes sont prêtes à être retirées.
 * Un seul email par membre, tous fournisseurs regroupés (v2.0-a).
 */
export async function sendDeliveryNotification({
  memberEmail,
  memberName,
  orders,
  globalTotal,
}: Params): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[email] Variables SMTP absentes — notification de livraison non envoyée.')
    return
  }

  if (orders.length === 0) return

  const adminEmail = process.env.ADMIN_EMAIL ?? site.email
  const displayName = memberName ?? 'cher·e adhérent·e'
  const multiple = orders.length > 1
  const supplierBlocks = buildSupplierBlocks(orders)

  const intro = multiple
    ? `Vos <strong>${orders.length} commandes</strong> sont disponibles et peuvent être retirées au magasin.`
    : `Votre commande <strong>${orders[0].supplierName}</strong> est disponible et peut être retirée au magasin.`

  const subject = multiple
    ? `✓ Vos commandes sont prêtes à être retirées — ${site.name}`
    : `✓ Votre commande ${orders[0].supplierName} est prête à être retirée — ${site.name}`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Votre commande est prête</title>
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
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#2e7d32;">Commande${multiple ? 's' : ''} disponible${multiple ? 's' : ''}</p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;">✓ ${multiple ? 'Vos commandes sont prêtes !' : 'Votre commande est prête !'}</h1>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
                Bonjour <strong>${displayName}</strong>,<br/>
                ${intro}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 8px;">
              <div style="background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:0 8px 8px 0;padding:12px 16px;">
                <p style="margin:0 0 4px;font-weight:700;font-size:13px;color:#1b5e20;">Horaires d'ouverture du magasin</p>
                <p style="margin:0;font-size:13px;color:#2e7d32;line-height:1.7;">
                  ${formatOpeningHoursHtml('fr')}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 24px;">
              <p style="margin:0 0 12px;font-weight:600;font-size:14px;color:#555;text-transform:uppercase;letter-spacing:0.04em;">Récapitulatif</p>
              ${supplierBlocks}

              <div style="background:#1a1a2e;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                <span style="color:#fff;font-size:15px;font-weight:600;">Total provisoire</span>
                <span style="color:#fff;font-size:20px;font-weight:700;">CHF&nbsp;${globalTotal.toFixed(2)}</span>
              </div>

              <p style="margin:16px 0 0;font-size:14px;color:#1565c0;line-height:1.7;">
                Des ajouts ou modifications sont possibles sur place avec l&apos;équipe du magasin avant la clôture.
                L&apos;avoir sera déduit à la <strong>clôture</strong> (montant définitif).
              </p>
              <p style="margin:20px 0 0;font-size:14px;color:#555;line-height:1.7;">
                Des questions ? Contactez-nous à
                <a href="mailto:${adminEmail}" style="color:#DC7F00;text-decoration:none;">${adminEmail}</a>.<br/>
                À très bientôt au magasin !
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#555;">— L'équipe du p'tit mag</p>
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

  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"${site.name}" <${process.env.SMTP_USER}>`,
    to: memberEmail,
    subject,
    html,
  })
}
