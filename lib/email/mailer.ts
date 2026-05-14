import nodemailer from 'nodemailer'

/**
 * Crée un transporteur Nodemailer à partir des variables d'environnement SMTP.
 * Lève une erreur si les variables obligatoires sont absentes.
 */
export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/** Renvoie true si les variables SMTP minimales sont définies. */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}
