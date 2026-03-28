'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  type PricingRule,
} from '@/actions/pricing';
import { updateSettings, type SiteSettingsMap } from '@/actions/settings';
import { Trash2, Plus, Pencil } from 'lucide-react';

type PricingFields = Pick<
  SiteSettingsMap,
  | 'pricePerNight'
  | 'priceWeekend'
  | 'priceSeasonHigh'
  | 'priceSeasonLow'
  | 'seasonHighStart'
  | 'seasonHighEnd'
  | 'longStayDiscount'
  | 'longStayThreshold'
  | 'depositPercent'
>;

type Props = {
  initialRules: PricingRule[];
  initialSettings: PricingFields;
};

export function PricingClient({ initialRules, initialSettings }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: '',
    dateFrom: '',
    dateTo: '',
    pricePerNight: '',
  });
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setForm({ label: '', dateFrom: '', dateTo: '', pricePerNight: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(rule: PricingRule) {
    setForm({
      label: rule.label,
      dateFrom: rule.dateFrom,
      dateTo: rule.dateTo,
      pricePerNight: String(rule.pricePerNight),
    });
    setEditingId(rule.id);
    setShowForm(true);
    setError(null);
  }

  function handleSubmit() {
    const price = parseFloat(form.pricePerNight);
    if (isNaN(price)) {
      setError('Podaj prawidłową cenę');
      return;
    }

    startTransition(async () => {
      const data = {
        label: form.label,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        pricePerNight: price,
      };

      if (editingId) {
        const result = await updatePricingRule(editingId, data);
        if ('error' in result) {
          setError(result.error ?? 'Wystąpił błąd');
          return;
        }
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingId ? { ...r, ...data } : r,
          ),
        );
      } else {
        const result = await createPricingRule(data);
        if ('error' in result) {
          setError(result.error ?? 'Wystąpił błąd');
          return;
        }
        setRules((prev) => [
          ...prev,
          { id: result.id!, ...data, isActive: true },
        ]);
      }
      resetForm();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Usunąć tę regułę cenową?')) return;
    startTransition(async () => {
      await deletePricingRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function handleToggleActive(rule: PricingRule) {
    startTransition(async () => {
      const result = await updatePricingRule(rule.id, { isActive: !rule.isActive });
      if ('error' in result) return;
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, isActive: !r.isActive } : r,
        ),
      );
    });
  }

  async function handleSettingsSave() {
    setSettingsSaving(true);
    const result = await updateSettings(settings);
    if (result && 'error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Cennik zapisany');
      router.refresh();
    }
    setSettingsSaving(false);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Cennik</h1>

      {/* Cennik bazowy */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Cennik bazowy</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Cena za noc (PLN)
            <Input
              type="number"
              step="0.5"
              min="0"
              value={settings.pricePerNight}
              onChange={(e) => setSettings({ ...settings, pricePerNight: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </label>

          <label className="block text-sm">
            Cena weekendowa (PLN) <span className="text-muted-foreground text-xs">(0 = brak)</span>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={settings.priceWeekend}
              onChange={(e) => setSettings({ ...settings, priceWeekend: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </label>
        </div>
      </section>

      {/* Cennik sezonowy */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Cennik sezonowy</h2>
        <p className="text-xs text-muted-foreground">Ustaw 0 aby wyłączyć daną cenę sezonową.</p>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Cena — sezon wysoki (PLN)
            <Input
              type="number"
              step="0.5"
              min="0"
              value={settings.priceSeasonHigh}
              onChange={(e) => setSettings({ ...settings, priceSeasonHigh: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </label>

          <label className="block text-sm">
            Cena — sezon niski (PLN)
            <Input
              type="number"
              step="0.5"
              min="0"
              value={settings.priceSeasonLow}
              onChange={(e) => setSettings({ ...settings, priceSeasonLow: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Sezon wysoki od (MM-DD)
            <Input
              value={settings.seasonHighStart}
              onChange={(e) => setSettings({ ...settings, seasonHighStart: e.target.value })}
              className="mt-1"
              placeholder="06-01"
            />
          </label>

          <label className="block text-sm">
            Sezon wysoki do (MM-DD)
            <Input
              value={settings.seasonHighEnd}
              onChange={(e) => setSettings({ ...settings, seasonHighEnd: e.target.value })}
              className="mt-1"
              placeholder="09-30"
            />
          </label>
        </div>
      </section>

      {/* Rabaty */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Rabat za długi pobyt</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Rabat (%)
            <Input
              type="number"
              min="0"
              max="100"
              value={settings.longStayDiscount}
              onChange={(e) => setSettings({ ...settings, longStayDiscount: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </label>

          <label className="block text-sm">
            Próg (noce)
            <Input
              type="number"
              min="1"
              max="365"
              value={settings.longStayThreshold}
              onChange={(e) => setSettings({ ...settings, longStayThreshold: parseInt(e.target.value) || 7 })}
              className="mt-1"
            />
          </label>
        </div>
      </section>

      {/* Zaliczka */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Zaliczka</h2>

        <div className="flex items-center gap-2">
          <label className="block text-sm max-w-[120px]">
            Wysokość (%)
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.depositPercent}
              onChange={(e) => setSettings({ ...settings, depositPercent: Number(e.target.value) })}
              className="mt-1"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Procentowa wysokość zaliczki od całkowitej ceny rezerwacji.
          {settings.depositPercent > 0 && ` Np. przy cenie 1000 zł zaliczka wyniesie ${settings.depositPercent * 10} zł.`}
        </p>
      </section>

      {/* Zapis ustawień cenowych */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSettingsSave} disabled={settingsSaving}>
          {settingsSaving ? 'Zapisuję...' : 'Zapisz ustawienia cenowe'}
        </Button>
      </div>

      {/* Reguły cenowe — cennik dat */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Cennik dat</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Ceny z cennika dat mają najwyższy priorytet — nadpisują cenę bazową, weekendową i sezonową.
            </p>
          </div>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Dodaj
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Formularz dodawania/edycji */}
          {showForm && (
            <div className="rounded-md border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium">
                {editingId ? 'Edytuj regułę' : 'Nowa reguła cenowa'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Nazwa</label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="np. Wakacje 2026"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Cena za noc (zł)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.pricePerNight}
                    onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                    placeholder="np. 350"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Od</label>
                  <Input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Do</label>
                  <Input
                    type="date"
                    value={form.dateTo}
                    onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                  {editingId ? 'Zapisz zmiany' : 'Dodaj regułę'}
                </Button>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              </div>
            </div>
          )}

          {/* Lista reguł */}
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Brak reguł cenowych. Używana jest cena bazowa / sezonowa z ustawień powyżej.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 ${
                    rule.isActive
                      ? 'border-border'
                      : 'border-border/50 opacity-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{rule.label}</span>
                      {!rule.isActive && (
                        <Badge variant="outline" className="text-[10px]">
                          Nieaktywna
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(rule.dateFrom)} — {formatDate(rule.dateTo)} · <strong>{rule.pricePerNight} zł</strong>/noc
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggleActive(rule)}
                      title={rule.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                    >
                      <span className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(rule)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
