'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { type TemplateKey, type EmailTemplate, type EmailTemplatesMap } from '@/lib/email-template-defaults';
import { getEmailTemplates } from '@/lib/email-templates';

const SETTINGS_KEY = 'emailTemplates';
const LOGO_KEY = 'mailingLogoUrl';

export async function updateMailingLogoUrl(url: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

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
