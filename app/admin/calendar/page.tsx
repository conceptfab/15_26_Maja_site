export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { CalendarView } from './CalendarView';

async function getData() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const sixMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 15, 0);

  const [reservations, blockedDates] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        checkOut: { gte: threeMonthsAgo },
        checkIn: { lte: sixMonthsAhead },
      },
      orderBy: { checkIn: 'asc' },
      select: {
        id: true,
        guestName: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    }),
    prisma.blockedDate.findMany({
      where: {
        date: { gte: threeMonthsAgo, lte: sixMonthsAhead },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  return {
    reservations: reservations.map((r) => ({
      ...r,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
    })),
    blockedDates: blockedDates.map((b) => ({
      ...b,
      date: b.date.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
  };
}

export default async function CalendarPage() {
  const data = await getData();

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Kalendarz</h1>
        <CalendarView
          reservations={data.reservations}
          blockedDates={data.blockedDates}
        />
      </div>
    </AdminShell>
  );
}
