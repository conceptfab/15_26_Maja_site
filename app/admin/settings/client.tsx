'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSettings, addAdmin, removeAdmin, type SiteSettingsMap } from '@/actions/settings';

type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  initialSettings: SiteSettingsMap;
  initialAdmins: AdminRow[];
};

export function SettingsClient({ initialSettings, initialAdmins }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Admin whitelist
  const [admins, setAdmins] = useState(initialAdmins);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const result = await updateSettings(settings);
    if (result.error) {
      setMsg(result.error);
    } else {
      setMsg('Zapisano');
      router.refresh();
    }
    setSaving(false);
  };

  const handleAddAdmin = async () => {
    setAdminMsg('');
    if (!newEmail) return;
    const result = await addAdmin(newEmail, newName || undefined);
    if (result.error) {
      setAdminMsg(result.error);
    } else {
      setNewEmail('');
      setNewName('');
      setAdminMsg('Dodano');
      router.refresh();
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (!confirm('Na pewno usunąć tego admina?')) return;
    setAdminMsg('');
    const result = await removeAdmin(id);
    if (result.error) {
      setAdminMsg(result.error);
    } else {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setAdminMsg('Usunięto');
    }
  };

  return (
    <div className="grid gap-8 max-w-2xl">
      {/* Cennik i goście */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Cennik i pojemność</h2>

        <label className="block text-sm">
          Cena za noc (PLN)
          <Input
            type="number"
            step="0.5"
            min="0"
            value={settings.pricePerNight}
            onChange={(e) => setSettings({ ...settings, pricePerNight: parseFloat(e.target.value) || 0 })}
            className="mt-1 max-w-xs"
          />
        </label>

        <label className="block text-sm">
          Maksymalna liczba gości
          <Input
            type="number"
            min="1"
            max="50"
            value={settings.maxGuests}
            onChange={(e) => setSettings({ ...settings, maxGuests: parseInt(e.target.value) || 1 })}
            className="mt-1 max-w-xs"
          />
        </label>
      </section>

      {/* Dane kontaktowe */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Dane kontaktowe</h2>

        <label className="block text-sm">
          Email
          <Input
            type="email"
            value={settings.contactEmail}
            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
            className="mt-1"
          />
        </label>

        <label className="block text-sm">
          Telefon
          <Input
            value={settings.contactPhone}
            onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
            className="mt-1"
          />
        </label>

        <label className="block text-sm">
          Instagram (URL)
          <Input
            value={settings.socialInstagram}
            onChange={(e) => setSettings({ ...settings, socialInstagram: e.target.value })}
            className="mt-1"
            placeholder="https://instagram.com/..."
          />
        </label>

        <label className="block text-sm">
          Facebook (URL)
          <Input
            value={settings.socialFacebook}
            onChange={(e) => setSettings({ ...settings, socialFacebook: e.target.value })}
            className="mt-1"
            placeholder="https://facebook.com/..."
          />
        </label>

        <label className="block text-sm">
          TikTok (URL)
          <Input
            value={settings.socialTiktok}
            onChange={(e) => setSettings({ ...settings, socialTiktok: e.target.value })}
            className="mt-1"
            placeholder="https://tiktok.com/..."
          />
        </label>
      </section>

      {/* Dane firmy */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Dane firmy</h2>

        <label className="block text-sm">
          Nazwa firmy
          <Input
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            className="mt-1"
          />
        </label>

        <label className="block text-sm">
          Adres
          <Input
            value={settings.companyAddress}
            onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
            className="mt-1"
          />
        </label>

        <label className="block text-sm">
          NIP
          <Input
            value={settings.companyNip}
            onChange={(e) => setSettings({ ...settings, companyNip: e.target.value })}
            className="mt-1"
          />
        </label>
      </section>

      {/* Zapis */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Zapisuję...' : 'Zapisz ustawienia'}
        </Button>
        {msg && (
          <span className={`text-sm ${msg === 'Zapisano' ? 'text-green-600' : 'text-red-600'}`}>
            {msg}
          </span>
        )}
      </div>

      {/* Admin whitelist */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Whitelist adminów</h2>

        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
              <div>
                <span className="font-medium">{admin.email}</span>
                {admin.name && <span className="text-muted-foreground ml-2">({admin.name})</span>}
              </div>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 h-7" onClick={() => handleRemoveAdmin(admin.id)}>
                Usuń
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-end pt-2 border-t border-border">
          <label className="text-sm flex-1">
            Email
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" placeholder="admin@example.com" />
          </label>
          <label className="text-sm w-40">
            Imię (opcjonalnie)
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
          </label>
          <Button size="sm" onClick={handleAddAdmin} disabled={!newEmail} className="mb-0.5">
            Dodaj
          </Button>
        </div>
        {adminMsg && (
          <span className={`text-xs ${adminMsg === 'Dodano' || adminMsg === 'Usunięto' ? 'text-green-600' : 'text-red-600'}`}>
            {adminMsg}
          </span>
        )}
      </section>
    </div>
  );
}
