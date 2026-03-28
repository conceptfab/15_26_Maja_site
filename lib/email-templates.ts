import { prisma } from '@/lib/db';
import {
  type EmailTemplatesMap,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-defaults';

const SETTINGS_KEY = 'emailTemplates';
const LOGO_KEY = 'mailingLogoUrl';
export const DEFAULT_MAILING_LOGO = '/assets/mailing_logo.webp';

export async function getMailingLogoUrl(): Promise<string> {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: LOGO_KEY } });
    if (setting?.value && typeof setting.value === 'object' && 'url' in (setting.value as object)) {
      return (setting.value as { url: string }).url || DEFAULT_MAILING_LOGO;
    }
  } catch {}
  return DEFAULT_MAILING_LOGO;
}

export async function getEmailTemplates(): Promise<EmailTemplatesMap> {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (setting?.value && typeof setting.value === 'object') {
      const stored = setting.value as Partial<EmailTemplatesMap>;
      return {
        guestConfirmation: stored.guestConfirmation ?? DEFAULT_TEMPLATES.guestConfirmation,
        adminNotification: stored.adminNotification ?? DEFAULT_TEMPLATES.adminNotification,
        statusDepositPaid: stored.statusDepositPaid ?? DEFAULT_TEMPLATES.statusDepositPaid,
        statusPaid: stored.statusPaid ?? DEFAULT_TEMPLATES.statusPaid,
        statusCancelled: stored.statusCancelled ?? DEFAULT_TEMPLATES.statusCancelled,
        statusCompleted: stored.statusCompleted ?? DEFAULT_TEMPLATES.statusCompleted,
      };
    }
  } catch {}
  return { ...DEFAULT_TEMPLATES };
}
