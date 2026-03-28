'use server';

import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';

import { overlapNights } from '@/lib/date-utils';
import { CONFIRMED_STATUSES, MONTH_NAMES } from '@/lib/reservation-status';

export async function getMonthlyReport(year: number, month: number) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const mStart = new Date(year, month, 1);
  const mEnd = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month for comparison
  const pmStart = new Date(year, month - 1, 1);
  const pmEnd = new Date(year, month, 1);

  const [reservations, prevReservations, blockedDates] = await Promise.all([
    prisma.reservation.findMany({
      where: { checkIn: { lt: mEnd }, checkOut: { gt: mStart }, status: { not: 'CANCELLED' } },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, status: true, guests: true },
    }),
    prisma.reservation.findMany({
      where: { checkIn: { lt: pmEnd }, checkOut: { gt: pmStart }, status: { not: 'CANCELLED' } },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, status: true },
    }),
    prisma.blockedDate.count({ where: { date: { gte: mStart, lt: mEnd } } }),
  ]);

  const confirmed = reservations.filter((r) => CONFIRMED_STATUSES.includes(r.status as typeof CONFIRMED_STATUSES[number]));
  const prevConfirmed = prevReservations.filter((r) => CONFIRMED_STATUSES.includes(r.status as typeof CONFIRMED_STATUSES[number]));

  let revenue = 0;
  let nights = 0;
  let totalGuests = 0;
  for (const r of confirmed) {
    const n = overlapNights(r.checkIn, r.checkOut, mStart, mEnd);
    nights += n;
    revenue += r.nights > 0 ? r.totalPrice * (n / r.nights) : 0;
    totalGuests += r.guests;
  }

  let prevRevenue = 0;
  let prevNights = 0;
  for (const r of prevConfirmed) {
    const n = overlapNights(r.checkIn, r.checkOut, pmStart, pmEnd);
    prevNights += n;
    prevRevenue += r.nights > 0 ? r.totalPrice * (n / r.nights) : 0;
  }

  const occupancy = Math.min(100, Math.round((nights / daysInMonth) * 100));
  const prevDays = new Date(year, month, 0).getDate();
  const prevOccupancy = prevDays > 0 ? Math.min(100, Math.round((prevNights / prevDays) * 100)) : 0;
  const avgPrice = nights > 0 ? Math.round(revenue / nights) : 0;

  return {
    revenue: Math.round(revenue),
    prevRevenue: Math.round(prevRevenue),
    reservations: confirmed.length,
    prevReservations: prevConfirmed.length,
    occupancy,
    prevOccupancy,
    avgPrice,
    nights,
    blockedDates,
    totalGuests,
  };
}

export async function getYearlyReport(year: number) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const yStart = new Date(year, 0, 1);
  const yEnd = new Date(year + 1, 0, 1);

  const reservations = await prisma.reservation.findMany({
    where: { checkIn: { lt: yEnd }, checkOut: { gt: yStart }, status: { not: 'CANCELLED' } },
    select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, status: true, guestName: true, guestEmail: true },
  });

  const confirmed = reservations.filter((r) => CONFIRMED_STATUSES.includes(r.status as typeof CONFIRMED_STATUSES[number]));

  const monthlyRevenue = MONTH_NAMES.map((name, i) => {
    const mStart = new Date(year, i, 1);
    const mEnd = new Date(year, i + 1, 1);
    let rev = 0;
    let occ = 0;
    for (const r of confirmed) {
      const n = overlapNights(r.checkIn, r.checkOut, mStart, mEnd);
      occ += n;
      rev += r.nights > 0 ? r.totalPrice * (n / r.nights) : 0;
    }
    const daysInM = new Date(year, i + 1, 0).getDate();
    return { name, revenue: Math.round(rev), occupancy: Math.min(100, Math.round((occ / daysInM) * 100)) };
  });

  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalNights = confirmed.reduce((s, r) => {
    return s + overlapNights(r.checkIn, r.checkOut, yStart, yEnd);
  }, 0);

  // Top klienci
  const clientMap = new Map<string, { name: string; email: string; total: number; count: number }>();
  for (const r of confirmed) {
    const key = r.guestEmail;
    const existing = clientMap.get(key);
    const n = overlapNights(r.checkIn, r.checkOut, yStart, yEnd);
    const rev = r.nights > 0 ? r.totalPrice * (n / r.nights) : 0;
    if (existing) {
      existing.total += rev;
      existing.count += 1;
    } else {
      clientMap.set(key, { name: r.guestName, email: r.guestEmail, total: rev, count: 1 });
    }
  }
  const topClients = [...clientMap.values()].sort((a, b) => b.total - a.total).slice(0, 5).map((c) => ({
    ...c,
    total: Math.round(c.total),
  }));

  return {
    totalRevenue,
    totalReservations: confirmed.length,
    totalNights,
    monthlyRevenue,
    topClients,
  };
}
