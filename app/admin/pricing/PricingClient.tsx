'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  type PricingRule,
} from '@/actions/pricing';
import { updateSettings, type SiteSettingsMap } from '@/actions/settings';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { calculatePrice, getNightDetails, type PricingRuleRange, type PriceSource } from '@/lib/pricing';

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

      {/* Symulator ceny — wyróżniony na górze */}
      <PriceSimulator settings={settings} rules={rules} />

      {/* Cennik bazowy */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Cennik bazowy</h2>

        <div className="grid grid-cols-2 gap-4">
          <NumberStepper
            label="Cena za noc (PLN)"
            tooltip="Podstawowa cena za jedną noc. Może być nadpisana przez cenę weekendową, sezonową lub regułę z cennika dat."
            value={settings.pricePerNight}
            onChange={(v) => setSettings({ ...settings, pricePerNight: v })}
            step={10}
            min={0}
            suffix="zł"
          />
          <NumberStepper
            label="Cena weekendowa (PLN)"
            tooltip="Cena obowiązująca w noce piątek→sobota i sobota→niedziela. Stosowana gdy jest wyższa od ceny sezonowej. Ustaw 0 aby wyłączyć."
            value={settings.priceWeekend}
            onChange={(v) => setSettings({ ...settings, priceWeekend: v })}
            step={10}
            min={0}
            suffix="zł"
          />
        </div>
      </section>

      {/* Cennik sezonowy */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Cennik sezonowy</h2>
        <p className="text-xs text-muted-foreground">Ustaw 0 aby wyłączyć daną cenę sezonową.</p>

        <div className="grid grid-cols-2 gap-4">
          <NumberStepper
            label="Cena — sezon wysoki (PLN)"
            tooltip="Cena w okresie sezonu wysokiego (daty poniżej). Nadpisuje cenę bazową. Ustaw 0 aby wyłączyć."
            value={settings.priceSeasonHigh}
            onChange={(v) => setSettings({ ...settings, priceSeasonHigh: v })}
            step={10}
            min={0}
            suffix="zł"
          />
          <NumberStepper
            label="Cena — sezon niski (PLN)"
            tooltip="Cena poza sezonem wysokim. Nadpisuje cenę bazową. Ustaw 0 aby wyłączyć."
            value={settings.priceSeasonLow}
            onChange={(v) => setSettings({ ...settings, priceSeasonLow: v })}
            step={10}
            min={0}
            suffix="zł"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Sezon wysoki od (MM-DD)
            <InfoTooltip text="Data początkowa sezonu w formacie MM-DD. Np. 06-01 = 1 czerwca. Obsługuje przełom roku (np. 11-01 do 03-31)." />
            <Input
              value={settings.seasonHighStart}
              onChange={(e) => setSettings({ ...settings, seasonHighStart: e.target.value })}
              className="mt-1"
              placeholder="06-01"
            />
          </label>

          <label className="block text-sm">
            Sezon wysoki do (MM-DD)
            <InfoTooltip text="Data końcowa sezonu w formacie MM-DD. Jeśli 'od' > 'do', system rozumie to jako okres przez zmianę roku." />
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
          <NumberStepper
            label="Rabat (%)"
            tooltip="Procent rabatu od całkowitej ceny rezerwacji. Aktywuje się gdy liczba nocy >= próg poniżej."
            value={settings.longStayDiscount}
            onChange={(v) => setSettings({ ...settings, longStayDiscount: v })}
            step={1}
            min={0}
            max={100}
            suffix="%"
          />
          <NumberStepper
            label="Próg (noce)"
            tooltip="Minimalna liczba nocy do aktywacji rabatu. Np. 7 = rabat od tygodnia wzwyż."
            value={settings.longStayThreshold}
            onChange={(v) => setSettings({ ...settings, longStayThreshold: v })}
            step={1}
            min={1}
            max={365}
            integer
          />
        </div>
      </section>

      {/* Zaliczka */}
      <section className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Zaliczka</h2>

        <div className="max-w-[200px]">
          <NumberStepper
            label="Wysokość (%)"
            tooltip="Procent ceny rezerwacji wymagany jako zaliczka. Obliczany od ceny PO rabacie. Ustaw 0 aby wyłączyć."
            value={settings.depositPercent}
            onChange={(v) => setSettings({ ...settings, depositPercent: v })}
            step={5}
            min={0}
            max={100}
            suffix="%"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Procentowa wysokość zaliczki od całkowitej ceny rezerwacji.
          {settings.depositPercent > 0 && ` Np. przy cenie 1000 zł zaliczka wyniesie ${Math.round(1000 * settings.depositPercent / 100)} zł.`}
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
                  <label className="text-xs text-muted-foreground">Nazwa <InfoTooltip text="Wewnętrzna nazwa reguły (np. 'Wakacje 2026', 'Sylwester'). Widoczna tylko w panelu." /></label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="np. Wakacje 2026"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Cena za noc (zł) <InfoTooltip text="Cena noclegowa w tym przedziale dat. Nadpisuje WSZYSTKIE inne ceny (bazową, weekendową, sezonową)." /></label>
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
                  <label className="text-xs text-muted-foreground">Od <InfoTooltip text="Pierwszy dzień obowiązywania reguły (włącznie)." /></label>
                  <Input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Do <InfoTooltip text="Ostatni dzień obowiązywania reguły (włącznie)." /></label>
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

// --- Symulator ceny ---

const SOURCE_LABELS: Record<PriceSource, string> = {
  rule: 'Reguła dat',
  weekend: 'Weekendowa',
  seasonHigh: 'Sezon wysoki',
  seasonLow: 'Sezon niski',
  base: 'Bazowa',
};

const SOURCE_COLORS: Record<PriceSource, string> = {
  rule: 'text-yellow-400',
  weekend: 'text-blue-400',
  seasonHigh: 'text-orange-400',
  seasonLow: 'text-cyan-400',
  base: 'text-muted-foreground',
};

function PriceSimulator({ settings, rules }: { settings: PricingFields; rules: PricingRule[] }) {
  const [simCheckIn, setSimCheckIn] = useState('');
  const [simCheckOut, setSimCheckOut] = useState('');

  const pricingRules: PricingRuleRange[] = useMemo(
    () => rules.filter((r) => r.isActive).map((r) => ({
      dateFrom: new Date(r.dateFrom),
      dateTo: new Date(r.dateTo),
      pricePerNight: r.pricePerNight,
    })),
    [rules],
  );

  const checkIn = simCheckIn ? new Date(simCheckIn) : null;
  const checkOut = simCheckOut ? new Date(simCheckOut) : null;
  const valid = checkIn && checkOut && checkOut > checkIn;

  const nightDetails = useMemo(
    () => valid ? getNightDetails(checkIn, checkOut, settings, pricingRules) : [],
    [valid, checkIn, checkOut, settings, pricingRules],
  );

  const breakdown = useMemo(
    () => valid ? calculatePrice(checkIn, checkOut, settings, pricingRules) : null,
    [valid, checkIn, checkOut, settings, pricingRules],
  );

  return (
    <Card className="border-primary/40 bg-primary/5 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          Symulator ceny
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sprawdź końcową cenę rezerwacji dla dowolnych dat. Używa aktualnych ustawień z formularza poniżej (bez konieczności zapisu).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Zameldowanie</label>
            <Input type="date" value={simCheckIn} onChange={(e) => setSimCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Wymeldowanie</label>
            <Input type="date" value={simCheckOut} onChange={(e) => setSimCheckOut(e.target.value)} />
          </div>
        </div>

        {valid && nightDetails.length > 0 && breakdown && (
          <>
            {/* Tabela nocy */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-1.5 text-left font-medium">Noc</th>
                    <th className="py-1.5 text-left font-medium">Data</th>
                    <th className="py-1.5 text-left font-medium">Dzień</th>
                    <th className="py-1.5 text-left font-medium">Źródło ceny</th>
                    <th className="py-1.5 text-right font-medium">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  {nightDetails.map((n, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5">{i + 1}</td>
                      <td className="py-1.5">{n.date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td className="py-1.5">{n.dayName}</td>
                      <td className={`py-1.5 font-medium ${SOURCE_COLORS[n.source]}`}>
                        {SOURCE_LABELS[n.source]}
                      </td>
                      <td className="py-1.5 text-right font-medium">{n.price} zł</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Podsumowanie */}
            <div className="rounded-md border border-border p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>Suma nocy ({nightDetails.length}):</span>
                <span className="font-medium">{breakdown.priceBeforeDiscount} zł</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Rabat za długi pobyt:
                  {nightDetails.length < settings.longStayThreshold && settings.longStayDiscount > 0 && (
                    <span className="text-muted-foreground text-xs ml-1">
                      (min. {settings.longStayThreshold} nocy, masz {nightDetails.length})
                    </span>
                  )}
                </span>
                <span className="font-medium">{breakdown.discount > 0 ? `-${breakdown.discount} zł` : '—'}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
                <span>Cena końcowa:</span>
                <span>{breakdown.totalPrice} zł</span>
              </div>
              {breakdown.depositAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Zaliczka ({settings.depositPercent}%):</span>
                  <span>{breakdown.depositAmount} zł</span>
                </div>
              )}
            </div>

            {/* Legenda priorytetów */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium mb-1">Hierarchia priorytetów cen:</p>
              <p><span className={SOURCE_COLORS.rule}>■</span> 1. Reguła z cennika dat — najwyższy priorytet</p>
              <p><span className={SOURCE_COLORS.weekend}>■</span> 2. Cena weekendowa — stosowana gdy wyższa od sezonowej</p>
              <p><span className={SOURCE_COLORS.seasonHigh}>■</span> 3. Cena sezonowa (wysoka/niska)</p>
              <p><span className={SOURCE_COLORS.base}>■</span> 4. Cena bazowa — najniższy priorytet</p>
            </div>
          </>
        )}

        {simCheckIn && simCheckOut && !valid && (
          <p className="text-sm text-red-400">Data wymeldowania musi być po dacie zameldowania.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Kontrolka numeryczna z suffixem ---

function NumberStepper({
  label,
  tooltip,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  integer,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  integer?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="flex items-center gap-1 mb-1">
        {label}
        <InfoTooltip text={tooltip} />
      </span>
      <div className="relative">
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            let v = integer ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0;
            if (v < min) v = min;
            if (max !== undefined && v > max) v = max;
            onChange(v);
          }}
          className={suffix ? 'pr-8' : ''}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
