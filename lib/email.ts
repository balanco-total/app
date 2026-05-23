import nodemailer from 'nodemailer'

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP environment variables missing (SMTP_HOST, SMTP_USER, SMTP_PASS)')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export type SendMailInput = {
  to: string
  subject: string
  text: string
  html: string
  from?: string
  replyTo?: string
}

export async function sendMail({ to, subject, text, html, from, replyTo }: SendMailInput) {
  const resolvedFrom = from ?? process.env.SMTP_FROM
  if (!resolvedFrom) throw new Error('SMTP_FROM environment variable missing')

  const transporter = getTransporter()
  await transporter.sendMail({ from: resolvedFrom, to, replyTo, subject, text, html })
}
