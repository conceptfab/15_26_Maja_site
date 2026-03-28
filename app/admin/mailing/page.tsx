import { getEmailTemplates, getMailingLogoUrl } from '@/lib/email-templates';
import { AdminShell } from '@/components/admin/AdminShell';
import { MailingEditor } from './MailingEditor';

export const metadata = { title: 'Szablony mailingu' };

export default async function MailingPage() {
  const [templates, logoUrl] = await Promise.all([getEmailTemplates(), getMailingLogoUrl()]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Szablony mailingu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edytuj treść emaili wysyłanych do gości i adminów. Użyj zmiennych w podwójnych klamrach, np. <code className="bg-muted px-1 rounded">{'{{guestName}}'}</code>.
          </p>
        </div>
        <MailingEditor initialTemplates={templates} initialLogoUrl={logoUrl} />
      </div>
    </AdminShell>
  );
}
