'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMonthlyReport, getYearlyReport } from '@/actions/reports';
import { formatPLN } from '@/lib/format';

const MONTH_NAMES_FULL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

function Delta({ current, previous, unit = '' }: { current: number; previous: number; unit?: string }) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const color = diff >= 0 ? 'text-green-400' : 'text-red-400';
  const sign = diff >= 0 ? '+' : '';
  return <span className={`text-xs ${color} ml-2`}>{sign}{pct}% vs prev</span>;
}

type MonthlyData = {
  revenue: number;
  prevRevenue: number;
  reservations: number;
  prevReservations: number;
  occupancy: number;
  prevOccupancy: number;
  avgPrice: number;
  nights: number;
  blockedDates: number;
  totalGuests: number;
};

type YearlyData = {
  totalRevenue: number;
  totalReservations: number;
  totalNights: number;
  monthlyRevenue: { name: string; revenue: number; occupancy: number }[];
  topClients: { name: string; email: string; total: number; count: number }[];
};

export function ReportsClient() {
  const now = new Date();
  const [tab, setTab] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [yearly, setYearly] = useState<YearlyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'monthly') {
      getMonthlyReport(year, month).then((r) => {
        if ('revenue' in r) setMonthly(r);
        setLoading(false);
      });
    } else {
      getYearlyReport(year).then((r) => {
        if ('totalRevenue' in r) setYearly(r);
        setLoading(false);
      });
    }
  }, [tab, year, month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Raporty</h1>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border overflow-hidden text-sm">
            <button className={`px-3 py-1.5 transition-colors ${tab === 'monthly' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setTab('monthly')}>Miesięczny</button>
            <button className={`px-3 py-1.5 transition-colors ${tab === 'yearly' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setTab('yearly')}>Roczny</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Drukuj</Button>
        </div>
      </div>

      {/* Nawigacja okresu */}
      <div className="flex items-center gap-3 text-sm">
        <Button variant="outline" size="sm" onClick={() => {
          if (tab === 'monthly') {
            if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
          } else { setYear(year - 1); }
        }}>←</Button>
        <span className="font-medium">
          {tab === 'monthly' ? `${MONTH_NAMES_FULL[month]} ${year}` : `${year}`}
        </span>
        <Button variant="outline" size="sm" onClick={() => {
          if (tab === 'monthly') {
            if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
          } else { setYear(year + 1); }
        }}>→</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Ładowanie...</p>
      ) : tab === 'monthly' && monthly ? (
        <div className="space-y-6 print:space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Przychód</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatPLN(monthly.revenue)}</p>
                <Delta current={monthly.revenue} previous={monthly.prevRevenue} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rezerwacje</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monthly.reservations}</p>
                <Delta current={monthly.reservations} previous={monthly.prevReservations} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Obłożenie</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monthly.occupancy}%</p>
                <Delta current={monthly.occupancy} previous={monthly.prevOccupancy} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Śr. cena/noc</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatPLN(monthly.avgPrice)}</p></CardContent>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Noce zajęte</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{monthly.nights}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dni zablokowane</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{monthly.blockedDates}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Łącznie gości</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{monthly.totalGuests}</p></CardContent>
            </Card>
          </div>
        </div>
      ) : tab === 'yearly' && yearly ? (
        <div className="space-y-6 print:space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Przychód roczny</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatPLN(yearly.totalRevenue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rezerwacje</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{yearly.totalReservations}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Noce zajęte</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{yearly.totalNights}</p></CardContent>
            </Card>
          </div>

          {/* Przychód miesięcznie */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Przychód i obłożenie wg miesięcy</CardTitle></CardHeader>
            <CardContent>
              {/* Desktop */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="px-3 py-2 font-medium">Miesiąc</th>
                    <th className="px-3 py-2 font-medium text-right">Przychód</th>
                    <th className="px-3 py-2 font-medium text-right">Obłożenie</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.monthlyRevenue.map((m) => (
                    <tr key={m.name} className="border-b border-border/50">
                      <td className="px-3 py-2">{m.name}</td>
                      <td className="px-3 py-2 text-right">{formatPLN(m.revenue)}</td>
                      <td className="px-3 py-2 text-right">{m.occupancy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border/50">
                {yearly.monthlyRevenue.map((m) => (
                  <div key={m.name} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatPLN(m.revenue)}</span>
                      <span className="text-muted-foreground ml-2">{m.occupancy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top klienci */}
          {yearly.topClients.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Top 5 klientów</CardTitle></CardHeader>
              <CardContent>
                {/* Desktop */}
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="px-3 py-2 font-medium">Klient</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium text-right">Rezerwacje</th>
                      <th className="px-3 py-2 font-medium text-right">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearly.topClients.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                        <td className="px-3 py-2 text-right">{c.count}</td>
                        <td className="px-3 py-2 text-right">{formatPLN(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-border/50">
                  {yearly.topClients.map((c, i) => (
                    <div key={i} className="py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-sm font-medium">{formatPLN(c.total)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.email} · {c.count} rez.</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
