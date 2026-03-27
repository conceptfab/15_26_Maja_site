'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
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

export function CalendarView({ reservations, blockedDates }: Props) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [blockReason, setBlockReason] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Przesunięcie — poniedziałek = 0
  const firstDayOffset = (getDay(monthStart) + 6) % 7;

  const getReservationsForDay = (day: Date) =>
    reservations.filter((r) => {
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
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
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </h2>
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
      </div>

      {/* Blokowanie dat */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Powód blokady (opcjonalnie)"
          value={blockReason}
          onChange={(e) => setBlockReason(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">Kliknij datę w kalendarzu, aby ją zablokować</p>
      </div>

      {/* Siatka kalendarza */}
      <Card>
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
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] border rounded p-1 text-xs transition-colors ${
                    isToday ? 'border-white/40' : 'border-border'
                  } ${blocked ? 'bg-red-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${isToday ? 'text-white' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    {blocked ? (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-300 text-[10px]"
                        onClick={() => handleUnblockDate(blocked.id)}
                        disabled={isPending}
                        title="Odblokuj datę"
                      >
                        ✕
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-muted-foreground/30 hover:text-red-400 text-[10px]"
                        onClick={() => handleBlockDate(day)}
                        disabled={isPending}
                        title="Zablokuj datę"
                      >
                        ⊘
                      </button>
                    )}
                  </div>

                  {blocked && (
                    <div className="text-[10px] text-red-400 truncate" title={blocked.reason || 'Zablokowana'}>
                      {blocked.reason || 'Zablokowana'}
                    </div>
                  )}

                  {dayReservations.map((r) => (
                    <Link
                      key={r.id}
                      href={`/admin/reservations/${r.id}`}
                      className={`block rounded px-1 py-0.5 text-[10px] truncate border-l-2 mb-0.5 hover:opacity-80 ${STATUS_COLORS[r.status] || 'bg-gray-500/20 border-gray-500'}`}
                      title={`${r.guestName} (${r.status})`}
                    >
                      {r.guestName}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
