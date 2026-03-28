'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { type TemplateKey, type EmailTemplate, type EmailTemplatesMap, interpolate } from '@/lib/email-template-defaults';
import { getEmailTemplates, getMailingLogoUrl } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mail';
import { getSettings } from '@/actions/settings';

const SETTINGS_KEY = 'emailTemplates';
const LOGO_KEY = 'mailingLogoUrl';

export async function updateMailingLogoUrl(url: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  if (!url.startsWith('https://') && !url.startsWith('/')) {
    return { error: 'URL musi zaczynać się od https:// lub /' };
  }

  await prisma.siteSettings.upsert({
    where: { key: LOGO_KEY },
    create: { id: crypto.randomUUID(), key: LOGO_KEY, value: { url } },
    update: { value: { url } },
  });
  return { success: true };
}

export async function updateEmailTemplate(key: TemplateKey, template: EmailTemplate) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const existing = await getEmailTemplates();
  const updated: EmailTemplatesMap = { ...existing, [key]: template };

  await prisma.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { id: crypto.randomUUID(), key: SETTINGS_KEY, value: updated as object },
    update: { value: updated as object },
  });

  return { success: true };
}

const SAMPLE_VARS: Record<string, string> = {
  guestName: 'Jan Kowalski',
  guestEmail: 'jan@example.com',
  guestPhone: '+48 600 123 456',
  checkIn: '15.07.2025',
  checkOut: '20.07.2025',
  nights: '5',
  guests: '2',
  totalPrice: '1022',
  comment: 'Proszę o wczesne zameldowanie.',
};

export async function sendTestEmail(key: TemplateKey) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const settings = await getSettings();
  const templates = await getEmailTemplates();
  const logoUrl = await getMailingLogoUrl();
  const tmpl = templates[key];

  const subject = `[TEST] ${interpolate(tmpl.subject, SAMPLE_VARS)}`;
  const body = interpolate(tmpl.body, SAMPLE_VARS);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="HOMMM" width="120" style="display:block;margin:0 auto 16px" />`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:24px auto;padding:24px;background:#fff;border-radius:8px">
      <div style="text-align:center;margin-bottom:32px">
        ${logoHtml}
        <h1 style="color:#be1622;font-size:28px;letter-spacing:4px;margin:0">HOMMM</h1>
      </div>
      ${body}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
        HOMMM &mdash; Your Special Time
      </div>
    </div>
  </body></html>`;

  const to = settings.contactEmail;
  const result = await sendEmail({ to, subject, html });

  if (!result.success) return { error: `Nie udało się wysłać: ${result.reason}` };
  return { success: true, sentTo: to };
}
