import { getSettings, getAdminWhitelist } from '@/actions/settings';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  const [settings, admins] = await Promise.all([
    getSettings(),
    getAdminWhitelist(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">Konfiguracja globalna serwisu i zarządzanie adminami.</p>
      </div>

      <SettingsClient initialSettings={settings} initialAdmins={admins} />
    </div>
  );
}
