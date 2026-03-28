'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OccupancyChartPoint = {
  name: string;
  occupied: number;
  pending: number;
  blocked: number;
  free: number;
};

type Props = {
  monthlyData: OccupancyChartPoint[];
  weeklyData: OccupancyChartPoint[];
  year: number;
};

type View = 'miesiace' | 'tygodnie';

const SEGMENTS = [
  { key: 'occupied' as const, label: 'Zajęte',       color: '#22c55e' },
  { key: 'pending' as const,  label: 'Oczekujące',   color: '#f59e0b' },
  { key: 'blocked' as const,  label: 'Zablokowane',  color: '#ef4444' },
  { key: 'free' as const,     label: 'Wolne',        color: '#374151' },
] as const;

function StackedBarChart({ data }: { data: OccupancyChartPoint[] }) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const isWeekly = data.length > 20;

  const max = Math.max(...data.map((d) => d.occupied + d.pending + d.blocked + d.free), 1);
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
      {/* Y labels */}
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
          const total = d.occupied + d.pending + d.blocked + d.free;
          return (
            <div key={i} className="flex-1 flex flex-col-reverse items-stretch justify-start h-full group relative"
              onMouseEnter={(e) => setTooltip({ idx: i, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
            >
              {SEGMENTS.map((seg) => {
                const val = d[seg.key];
                if (!val) return null;
                const pct = (val / max) * 100;
                return (
                  <div key={seg.key} style={{ height: `${pct}%`, backgroundColor: seg.color, minHeight: val > 0 ? 2 : 0 }}
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
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground">{seg.label}:</span>
              <span className="font-medium ml-auto">{hovered[seg.key]} dni</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReservationsChart({ monthlyData, weeklyData, year }: Props) {
  const [view, setView] = useState<View>('miesiace');
  const data = view === 'miesiace' ? monthlyData : weeklyData;
  const hasData = data.some((d) => d.occupied > 0 || d.pending > 0 || d.blocked > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Obłożenie {year}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Dni w miesiącu wg kategorii</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-3 mr-2">
              {SEGMENTS.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
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
