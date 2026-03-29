import nodemailer from 'nodemailer';
import { getEmailTemplates, getMailingLogoUrl } from '@/lib/email-templates';
import { interpolate } from '@/lib/email-template-defaults';
import { emailLayout } from '@/lib/email-layout';
export { emailLayout };

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

const globalForMail = globalThis as unknown as { _smtpTransport?: nodemailer.Transporter | null; _smtpChecked?: boolean };

function getTransport() {
  if (globalForMail._smtpChecked) return globalForMail._smtpTransport ?? null;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  globalForMail._smtpChecked = true;

  if (!host || !user || !pass) {
    globalForMail._smtpTransport = null;
    return null;
  }

  globalForMail._smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return globalForMail._smtpTransport;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const transport = getTransport();

  if (!transport) {
    console.warn('[mail] SMTP not configured — email skipped:', { to, subject });
    return { success: false, reason: 'smtp_not_configured' } as const;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@hommm.eu';

  try {
    await transport.sendMail({ from, to, subject, html });
    return { success: true } as const;
  } catch (error) {
    console.error('[mail] Failed to send email:', error);
    return { success: false, reason: 'send_failed' } as const;
  }
}

// --- Typy danych ---

import { format } from 'date-fns';

export type ReservationEmailData = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  comment?: string;
};

/** Mapuje rezerwację DB na dane do szablonu email */
export function toReservationEmailData(r: {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  totalPrice: number;
  comment?: string | null;
}): ReservationEmailData {
  return {
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone || '',
    checkIn: format(r.checkIn, 'dd.MM.yyyy'),
    checkOut: format(r.checkOut, 'dd.MM.yyyy'),
    nights: r.nights,
    guests: r.guests,
    totalPrice: r.totalPrice,
    comment: r.comment || undefined,
  };
}

// --- Szablony z DB (z fallback na defaults) ---

export async function loadEmailContext() {
  return Promise.all([getEmailTemplates(), getMailingLogoUrl()]);
}

export async function buildGuestConfirmationEmail(
  data: ReservationEmailData,
  ctx?: [Awaited<ReturnType<typeof getEmailTemplates>>, string | null],
) {
  const [templates, logoUrl] = ctx ?? await loadEmailContext();
  const tmpl = templates.guestConfirmation;
  const vars = { ...data, nights: String(data.nights), guests: String(data.guests), totalPrice: String(data.totalPrice) };
  return {
    subject: interpolate(tmpl.subject, vars),
    html: emailLayout(interpolate(tmpl.body, vars), logoUrl),
  };
}

export async function buildAdminNotificationEmail(
  data: ReservationEmailData,
  ctx?: [Awaited<ReturnType<typeof getEmailTemplates>>, string | null],
) {
  const [templates, logoUrl] = ctx ?? await loadEmailContext();
  const tmpl = templates.adminNotification;
  const vars = { ...data, nights: String(data.nights), guests: String(data.guests), totalPrice: String(data.totalPrice) };
  return {
    subject: interpolate(tmpl.subject, vars),
    html: emailLayout(interpolate(tmpl.body, vars), logoUrl),
  };
}

export async function buildStatusChangeEmail(
  guestName: string,
  status: string,
  ctx?: [Awaited<ReturnType<typeof getEmailTemplates>>, string | null],
) {
  const [templates, logoUrl] = ctx ?? await Promise.all([getEmailTemplates(), getMailingLogoUrl()]);

  const keyMap: Record<string, keyof typeof templates> = {
    DEPOSIT_PAID: 'statusDepositPaid',
    PAID: 'statusPaid',
    CANCELLED: 'statusCancelled',
    COMPLETED: 'statusCompleted',
  };

  const tmplKey = keyMap[status];
  if (!tmplKey) return null;

  const tmpl = templates[tmplKey];
  const vars = { guestName };
  return {
    subject: interpolate(tmpl.subject, vars),
    html: emailLayout(interpolate(tmpl.body, vars), logoUrl),
  };
}
