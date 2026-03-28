import nodemailer from 'nodemailer';
import { getEmailTemplates, getMailingLogoUrl } from '@/lib/email-templates';
import { interpolate } from '@/lib/email-template-defaults';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
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

// --- Layout wrappera emaila ---

const BRAND_COLOR = '#be1622';

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
  return base ? `${base.startsWith('http') ? '' : 'https://'}${base}${path}` : path;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function emailLayout(content: string, logoUrl: string | null) {
  const logoHtml = logoUrl
    ? `<img src="${escapeAttr(toAbsoluteUrl(logoUrl))}" alt="HOMMM" width="120" style="display:block;margin:0 auto 16px" />`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:24px auto;padding:24px;background:#fff;border-radius:8px">
      <div style="text-align:center;margin-bottom:32px">
        ${logoHtml}
        <h1 style="color:${BRAND_COLOR};font-size:28px;letter-spacing:4px;margin:0">HOMMM</h1>
      </div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
        HOMMM &mdash; Your Special Time
      </div>
    </div>
  </body></html>`;
}

// --- Typy danych ---

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

export async function buildStatusChangeEmail(guestName: string, status: string) {
  const [templates, logoUrl] = await Promise.all([getEmailTemplates(), getMailingLogoUrl()]);

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
