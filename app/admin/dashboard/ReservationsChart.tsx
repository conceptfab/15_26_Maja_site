'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ChartPoint = {
  name: string;
  PENDING: number;
  DEPOSIT_PAID: number;
  PAID: number;
  COMPLETED: number;
  CANCELLED: number;
  BLOCKED: number;
};

type Props = {
  monthlyData: ChartPoint[];
  weeklyData: ChartPoint[];
  year: number;
};

type View = 'miesiace' | 'tygodnie';

const STATUSES = [
  { key: 'PENDING' as const,      label: 'Oczekująca',  color: '#f59e0b' },
  { key: 'DEPOSIT_PAID' as const, label: 'Zaliczka',    color: '#3b82f6' },
  { key: 'PAID' as const,         label: 'Opłacona',    color: '#22c55e' },
  { key: 'COMPLETED' as const,    label: 'Opłacona',    color: '#22c55e' },
  { key: 'CANCELLED' as const,    label: 'Anulowana',   color: '#f97316' },
  { key: 'BLOCKED' as const,      label: 'Zablokowana', color: '#7f1d1d' },
] as const;

const LEGEND = [
  { label: 'Oczekująca',  color: '#f59e0b' },
  { label: 'Zaliczka',    color: '#3b82f6' },
  { label: 'Opłacona',    color: '#22c55e' },
  { label: 'Anulowana',   color: '#f97316' },
  { label: 'Zablokowana', color: '#7f1d1d' },
];

function niceMax(max: number): number {
  if (max <= 0) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  for (const s of [1, 2, 5, 10]) {
    const candidate = Math.ceil(max / (magnitude * s)) * magnitude * s;
    if (candidate >= max) return candidate;
  }
  return Math.ceil(max);
}

function StackedBarChart({ data }: { data: ChartPoint[] }) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const isWeekly = data.length > 20;

  const totals = data.map((d) => STATUSES.reduce((s, st) => s + d[st.key], 0));
  const rawMax = Math.max(...totals, 1);
  const max = niceMax(rawMax);
  const H = 240;
  const BAR_H = H - 28;
  const STEPS = 5;

  const yLabels = Array.from({ length: STEPS + 1 }, (_, i) => ({
    v: Math.round((max / STEPS) * i),
    pct: (i / STEPS) * 100,
  }));

  const hovered = tooltip !== null ? data[tooltip.idx] : null;

  return (
    <div className="relative w-full" style={{ height: H }}>
      {/* Grid + Y labels */}
      <div className="absolute" style={{ top: 0, left: 0, width: 28, bottom: 28 }}>
        {[...yLabels].reverse().map((l, i) => (
          <div key={i} className="absolute right-1 text-[10px] text-muted-foreground leading-none -translate-y-1/2"
            style={{ bottom: `${l.pct}%` }}>
            {l.v}
          </div>
        ))}
      </div>
      {[...yLabels].map((l, i) => (
        <div key={i} className="absolute border-t border-border/30"
          style={{ bottom: `calc(28px + ${l.pct}% * (${BAR_H}px / ${H}px) * ${H / BAR_H})`, left: 32, right: 0 }} />
      ))}

      {/* Bars */}
      <div className="absolute flex items-end gap-0.5" style={{ top: 0, left: 32, right: 0, bottom: 28 }}>
        {data.map((d, i) => {
          const total = totals[i];
          const show = isWeekly ? i % 4 === 0 : true;
          return (
            <div key={i} className="flex-1 flex flex-col-reverse items-stretch justify-start h-full group relative"
              onMouseEnter={(e) => setTooltip({ idx: i, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
            >
              {STATUSES.map((st) => {
                const val = d[st.key];
                if (!val) return null;
                const pct = (val / max) * 100;
                return (
                  <div key={st.key} style={{ height: `${pct}%`, backgroundColor: st.color, minHeight: 2 }}
                    className="w-full transition-all duration-300 first:rounded-t-sm" />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* X labels */}
      <div className="absolute flex" style={{ left: 32, right: 0, bottom: 0, height: 28 }}>
        {data.map((d, i) => {
          const show = isWeekly ? i % 4 === 0 : true;
          return (
            <div key={i} className="flex-1 flex items-center justify-center">
              {show && <span className="text-[10px] text-muted-foreground">{d.name}</span>}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hovered && tooltip && (
        <div className="fixed z-50 pointer-events-none bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs min-w-[140px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <p className="font-semibold mb-1.5">{hovered.name}</p>
          {STATUSES.filter((st, i, arr) => arr.findIndex(x => x.key === st.key) === i).map((st) => hovered[st.key] > 0 && (
            <div key={st.key} className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: st.color }} />
              <span className="text-muted-foreground">{st.label}:</span>
              <span className="font-medium ml-auto">{hovered[st.key]}</span>
            </div>
          ))}
          <div className="border-t border-border mt-1.5 pt-1 flex justify-between">
            <span className="text-muted-foreground">Razem:</span>
            <span className="font-semibold">{totals[tooltip.idx]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReservationsChart({ monthlyData, weeklyData, year }: Props) {
  const [view, setView] = useState<View>('miesiace');
  const data = view === 'miesiace' ? monthlyData : weeklyData;
  const hasData = data.some((d) => STATUSES.some((s) => d[s.key] > 0));
  const total = data.reduce((s, d) => s + STATUSES.reduce((ss, st) => ss + d[st.key], 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Rezerwacje {year}</CardTitle>
            {hasData && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Łącznie: <span className="font-medium text-foreground">{total}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Legenda */}
            <div className="flex items-center gap-3 mr-2">
              {LEGEND.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Widok */}
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button className={`px-3 py-1.5 transition-colors ${view === 'miesiace' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setView('miesiace')}>Miesiące</button>
              <button className={`px-3 py-1.5 transition-colors ${view === 'tygodnie' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setView('tygodnie')}>Tygodnie</button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Brak danych za {year}
          </div>
        ) : (
          <StackedBarChart data={data} />
        )}
      </CardContent>
    </Card>
  );
}
