'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  eachDayOfInterval,
  differenceInCalendarDays,
  isSameMonth,
  isSameDay,
  isBefore,
  isWithinInterval,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { addBlockedDate, removeBlockedDate } from '@/actions/reservations';

type Reservation = {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
  type: string;
  createdAt: string;
};

type Props = {
  reservations: Reservation[];
  blockedDates: BlockedDate[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/30 border-yellow-500',
  DEPOSIT_PAID: 'bg-blue-500/30 border-blue-500',
  PAID: 'bg-green-500/30 border-green-500',
  COMPLETED: 'bg-gray-500/30 border-gray-500',
};

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  DEPOSIT_PAID: 'Zaliczka',
  PAID: 'Opłacona',
  COMPLETED: 'Zakończona',
  CANCELLED: 'Anulowana',
};

export function CalendarView({ reservations, blockedDates }: Props) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [blockReason, setBlockReason] = useState('');
  const [tooltip, setTooltip] = useState<{ r: Reservation; x: number; y: number } | null>(null);
  const today = startOfDay(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Przesunięcie — poniedziałek = 0
  const firstDayOffset = (getDay(monthStart) + 6) % 7;

  const getReservationsForDay = (day: Date) =>
    reservations.filter((r) => {
      const checkIn = startOfDay(new Date(r.checkIn));
      const checkOut = startOfDay(new Date(r.checkOut));
      // checkout = dzień wyjazdu (gość nie nocuje), więc ostatni nocleg = checkOut - 1 dzień
      return isWithinInterval(day, { start: checkIn, end: new Date(checkOut.getTime() - 86400000) });
    });

  const getBlockedForDay = (day: Date) =>
    blockedDates.find((b) => isSameDay(new Date(b.date), day));

  const handleBlockDate = (date: Date) => {
    startTransition(async () => {
      await addBlockedDate(date.toISOString(), blockReason || undefined);
      setBlockReason('');
      router.refresh();
    });
  };

  const handleToggleService = (day: Date) => {
    const existing = getBlockedForDay(day);
    if (existing?.type === 'SERVICE') {
      handleUnblockDate(existing.id);
    } else if (!existing) {
      startTransition(async () => {
        await addBlockedDate(day.toISOString(), 'Serwis', 'SERVICE');
        router.refresh();
      });
    }
  };

  const handleUnblockDate = (id: string) => {
    startTransition(async () => {
      await removeBlockedDate(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Nawigacja miesiąca */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          ← Poprzedni
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: pl })}
          </h2>
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>
              Dziś
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
          Następny →
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500" /> Oczekująca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500" /> Zaliczka</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-500" /> Opłacona</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500" /> Zablokowana</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500" /> Serwis</span>
      </div>


      {/* Siatka kalendarza (desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px">
            {/* Nagłówki dni */}
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}

            {/* Puste komórki na początku */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dni miesiąca */}
            {days.map((day) => {
              const dayReservations = getReservationsForDay(day);
              const blocked = getBlockedForDay(day);
              const isCurrentDay = isSameDay(day, today);
              const isPast = isBefore(day, today) && !isCurrentDay;

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] border rounded p-1 text-xs transition-colors ${
                    isCurrentDay ? 'border-white/40' : 'border-border'
                  } ${blocked ? (blocked.type === 'SERVICE' ? 'bg-purple-500/10' : 'bg-red-500/10') : ''} ${isPast ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${isCurrentDay ? 'text-white' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center gap-1">
                      {!isPast && (
                        <button
                          type="button"
                          className={`text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            blocked?.type === 'SERVICE'
                              ? 'bg-purple-500 text-white'
                              : 'text-muted-foreground/30 hover:bg-purple-500/20 hover:text-purple-400'
                          }`}
                          onClick={() => handleToggleService(day)}
                          disabled={isPending || (blocked != null && blocked.type !== 'SERVICE')}
                          title={blocked?.type === 'SERVICE' ? 'Usuń serwis' : 'Dodaj serwis'}
                        >
                          S
                        </button>
                      )}
                      {!isPast && (
                        blocked && blocked.type !== 'SERVICE' ? (
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300 text-[10px]"
                            onClick={() => handleUnblockDate(blocked.id)}
                            disabled={isPending}
                            title="Odblokuj datę"
                          >
                            ✕
                          </button>
                        ) : !blocked ? (
                          <button
                            type="button"
                            className="text-muted-foreground/30 hover:text-red-400 text-[10px]"
                            onClick={() => handleBlockDate(day)}
                            disabled={isPending}
                            title="Zablokuj datę"
                          >
                            ⊘
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>

                  {blocked && (
                    <div className={`text-[10px] truncate ${blocked.type === 'SERVICE' ? 'text-purple-400' : 'text-red-400'}`}
                      title={blocked.reason || (blocked.type === 'SERVICE' ? 'Serwis' : 'Zablokowana')}>
                      {blocked.reason || (blocked.type === 'SERVICE' ? 'Serwis' : 'Zablokowana')}
                    </div>
                  )}

                  {dayReservations.map((r) => {
                    const nights = differenceInCalendarDays(new Date(r.checkOut), new Date(r.checkIn));
                    return (
                      <Link
                        key={r.id}
                        href={`/admin/reservations/${r.id}`}
                        className={`block rounded px-1 py-0.5 text-[10px] truncate border-l-2 mb-0.5 hover:opacity-80 ${STATUS_COLORS[r.status] || 'bg-gray-500/20 border-gray-500'}`}
                        onMouseEnter={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {r.guestName} ({nights}n)
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Widok listowy (mobile) */}
      <Card className="md:hidden">
        <CardContent className="p-0 divide-y divide-border/50">
          {days.filter((day) => {
            const dayReservations = getReservationsForDay(day);
            const blocked = getBlockedForDay(day);
            return dayReservations.length > 0 || blocked;
          }).length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Brak rezerwacji i blokad w tym miesiącu</p>
          ) : (
            days.map((day) => {
              const dayReservations = getReservationsForDay(day);
              const blocked = getBlockedForDay(day);
              const isCurrentDay = isSameDay(day, today);
              const isPast = isBefore(day, today) && !isCurrentDay;

              if (dayReservations.length === 0 && !blocked) return null;

              return (
                <div key={day.toISOString()} className={`px-4 py-3 ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isCurrentDay ? 'text-white' : ''}`}>
                      {format(day, 'EEEE, d MMM', { locale: pl })}
                    </span>
                    {!isPast && !blocked && (
                      <button
                        type="button"
                        className="text-muted-foreground/40 hover:text-red-400 text-xs"
                        onClick={() => handleBlockDate(day)}
                        disabled={isPending}
                      >
                        Zablokuj
                      </button>
                    )}
                  </div>

                  {blocked && (
                    <div className={`flex items-center justify-between text-xs mb-1 ${blocked.type === 'SERVICE' ? 'text-purple-400' : 'text-red-400'}`}>
                      <span>{blocked.type === 'SERVICE' ? '🔧' : '🚫'} {blocked.reason || (blocked.type === 'SERVICE' ? 'Serwis' : 'Zablokowana')}</span>
                      {!isPast && (
                        <button
                          type="button"
                          className={blocked.type === 'SERVICE' ? 'hover:text-purple-300' : 'hover:text-red-300'}
                          onClick={() => handleUnblockDate(blocked.id)}
                          disabled={isPending}
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  )}

                  {dayReservations.map((r) => {
                    const nights = differenceInCalendarDays(new Date(r.checkOut), new Date(r.checkIn));
                    return (
                      <Link
                        key={r.id}
                        href={`/admin/reservations/${r.id}`}
                        className={`flex items-center justify-between rounded px-2 py-1.5 text-xs border-l-2 mb-1 ${STATUS_COLORS[r.status] || 'bg-gray-500/20 border-gray-500'}`}
                      >
                        <span className="font-medium truncate">{r.guestName}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">
                          {format(new Date(r.checkIn), 'dd.MM')}–{format(new Date(r.checkOut), 'dd.MM')} ({nights}n)
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Tooltip rezerwacji */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs min-w-[180px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold mb-1">{tooltip.r.guestName}</p>
          <p className="text-muted-foreground">
            {format(new Date(tooltip.r.checkIn), 'dd.MM')} – {format(new Date(tooltip.r.checkOut), 'dd.MM.yyyy')}
          </p>
          <p className="text-muted-foreground">
            Status: {STATUS_LABELS[tooltip.r.status] || tooltip.r.status}
          </p>
        </div>
      )}
    </div>
  );
}
