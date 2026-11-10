import nodemailer, { type SendMailOptions } from 'nodemailer'
import { site } from '@/lib/site'

/** Adresse visible : la boîte du P'tit Mag, pas le compte technique qui envoie. */
export function associationFrom(): string {
  return `"${site.name}" <${site.email}>`
}

/**
 * Crée un transporteur Nodemailer à partir des variables d'environnement SMTP.
 * Lève une erreur si les variables obligatoires sont absentes.
 */
export function createTransporter() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
  })
  return {
    sendMail(options: SendMailOptions) {
      const prepared: SendMailOptions = {
        ...options,
        from: associationFrom(),
        replyTo: site.email,
      }
      return transporter.sendMail(prepared)
    },
  }
}

/** Renvoie true si les variables SMTP minimales sont définies. */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}
