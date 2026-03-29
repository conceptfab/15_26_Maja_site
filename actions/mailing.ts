'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { type TemplateKey, type EmailTemplate, type EmailTemplatesMap, interpolate, SAMPLE_VARS } from '@/lib/email-template-defaults';
import { getEmailTemplates, getMailingLogoUrl } from '@/lib/email-templates';
import { sendEmail, emailLayout } from '@/lib/mail';
import { getSettings } from '@/actions/settings';

const SETTINGS_KEY = 'emailTemplates';
const LOGO_KEY = 'mailingLogoUrl';

export async function updateMailingLogoUrl(url: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

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
  if (!session) return unauthorized();

  const existing = await getEmailTemplates();
  const updated: EmailTemplatesMap = { ...existing, [key]: template };

  await prisma.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { id: crypto.randomUUID(), key: SETTINGS_KEY, value: updated as object },
    update: { value: updated as object },
  });

  return { success: true };
}

export async function sendTestEmail(key: TemplateKey) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const settings = await getSettings();
  const templates = await getEmailTemplates();
  const logoUrl = await getMailingLogoUrl();
  const tmpl = templates[key];

  const subject = `[TEST] ${interpolate(tmpl.subject, SAMPLE_VARS)}`;
  const body = interpolate(tmpl.body, SAMPLE_VARS);

  const html = emailLayout(body, logoUrl);

  const to = settings.contactEmail;
  const result = await sendEmail({ to, subject, html });

  if (!result.success) return { error: `Nie udało się wysłać: ${result.reason}` };
  return { success: true, sentTo: to };
}
