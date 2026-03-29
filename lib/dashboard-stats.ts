import { prisma } from '@/lib/db';
import { CONFIRMED_STATUSES, MONTH_NAMES } from '@/lib/reservation-status';
import { overlapNights, proportionalRevenue, getWeekOfYear } from '@/lib/date-utils';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

export type OccupancyChartPoint = {
  name: string;
  paid: number;
  deposit: number;
  pending: number;
  blocked: number;
  free: number;
};

type ReservationBase = {
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: number;
};

type ReservationWithStatus = ReservationBase & { status: string };

type Alert = { type: string; message: string; href: string };

// ---------------------------------------------------------------------------
// Helpers (prywatne)
// ---------------------------------------------------------------------------

/** Statusy w pełni opłacone (bez zaliczki) */
const FULLY_PAID_STATUSES: readonly string[] = ['PAID', 'COMPLETED'];

/** Klasyfikuje noce rezerwacji wg statusu w danym przedziale */
function classifyNights(
  data: ReservationWithStatus[],
  rangeStart: Date,
  rangeEnd: Date,
): { paid: number; deposit: number; pending: number } {
  let paid = 0;
  let deposit = 0;
  let pending = 0;
  for (const r of data) {
    const nights = overlapNights(r.checkIn, r.checkOut, rangeStart, rangeEnd);
    if (nights <= 0) continue;
    if (FULLY_PAID_STATUSES.includes(r.status)) {
      paid += nights;
    } else if (r.status === 'DEPOSIT_PAID') {
      deposit += nights;
    } else if (r.status === 'PENDING') {
      pending += nights;
    }
  }
  return { paid, deposit, pending };
}

/** Pre-grupuje blocked dates wg miesiąca */
function groupBlockedByMonth(blocked: { date: Date; type: string }[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const b of blocked) {
    const m = new Date(b.date).getMonth();
    map.set(m, (map.get(m) ?? 0) + 1);
  }
  return map;
}

/** Pre-grupuje blocked dates wg tygodnia */
function groupBlockedByWeek(blocked: { date: Date; type: string }[], year: number): Map<number, number> {
  const map = new Map<number, number>();
  for (const b of blocked) {
    const bd = new Date(b.date);
    if (bd.getFullYear() === year) {
      const w = getWeekOfYear(bd);
      map.set(w, (map.get(w) ?? 0) + 1);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Obliczenia KPI
// ---------------------------------------------------------------------------

function computeRevenueAndOccupancy(
  reservations: ReservationBase[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  let revenue = 0;
  let nights = 0;
  for (const r of reservations) {
    const n = overlapNights(r.checkIn, r.checkOut, rangeStart, rangeEnd);
    nights += n;
    revenue += proportionalRevenue(r.totalPrice, r.nights, n);
  }
  return { revenue, nights };
}

function computeKpis(
  allReservations: (ReservationWithStatus & { createdAt: Date; updatedAt: Date })[],
  statusCounts: { status: string; _count: number }[],
  totalReservations: number,
  now: Date,
) {
  let totalConfirmedNights = 0;
  let totalConfirmedRevenue = 0;
  let confirmedCount = 0;
  let responseTimeSum = 0;
  let respondedCount = 0;
  let forecastedRevenue = 0;

  const in7Days = new Date(now.getTime() + 7 * 86400000);
  let upcoming7Days = 0;

  for (const r of allReservations) {
    const isConfirmed = (CONFIRMED_STATUSES as readonly string[]).includes(r.status);

    if (isConfirmed) {
      totalConfirmedNights += r.nights;
      totalConfirmedRevenue += r.totalPrice;
      confirmedCount++;
    }

    if (r.status !== 'PENDING' && r.updatedAt.getTime() > r.createdAt.getTime()) {
      responseTimeSum += r.updatedAt.getTime() - r.createdAt.getTime();
      respondedCount++;
    }

    if (r.status === 'DEPOSIT_PAID' && r.checkIn > now) {
      forecastedRevenue += r.totalPrice;
    }

    if (r.checkIn >= now && r.checkIn <= in7Days && r.status !== 'CANCELLED') {
      upcoming7Days++;
    }
  }

  const avgPricePerNight = totalConfirmedNights > 0 ? Math.round(totalConfirmedRevenue / totalConfirmedNights) : 0;
  const avgStayLength = confirmedCount > 0 ? +(totalConfirmedNights / confirmedCount).toFixed(1) : 0;
  const avgResponseHours = respondedCount > 0 ? Math.round(responseTimeSum / respondedCount / (1000 * 60 * 60)) : 0;

  const fullyPaidCount = statusCounts
    .filter((r) => FULLY_PAID_STATUSES.includes(r.status))
    .reduce((s, r) => s + r._count, 0);
  const cancelledCount = statusCounts.find((r) => r.status === 'CANCELLED')?._count ?? 0;

  const conversionRate = totalReservations > 0 ? Math.round((fullyPaidCount / totalReservations) * 100) : 0;
  const cancellationRate = totalReservations > 0 ? Math.round((cancelledCount / totalReservations) * 100) : 0;

  return {
    avgPricePerNight,
    avgStayLength,
    avgResponseHours,
    conversionRate,
    cancellationRate,
    forecastedRevenue,
    upcoming7Days,
  };
}

// ---------------------------------------------------------------------------
// Wykresy obłożenia
// ---------------------------------------------------------------------------

function buildMonthlyChart(
  yearlyData: ReservationWithStatus[],
  blockedByMonth: Map<number, number>,
  year: number,
): OccupancyChartPoint[] {
  return MONTH_NAMES.map((name, monthIdx) => {
    const mStart = new Date(year, monthIdx, 1);
    const mEnd = new Date(year, monthIdx + 1, 1);
    const daysInM = new Date(year, monthIdx + 1, 0).getDate();

    const { paid, deposit, pending } = classifyNights(yearlyData, mStart, mEnd);
    const blocked = blockedByMonth.get(monthIdx) ?? 0;
    const free = Math.max(0, daysInM - paid - deposit - pending - blocked);

    return { name, paid, deposit, pending, blocked, free };
  });
}

function buildWeeklyChart(
  yearlyData: ReservationWithStatus[],
  blockedByWeek: Map<number, number>,
  year: number,
): OccupancyChartPoint[] {
  const totalWeeks = getWeekOfYear(new Date(year, 11, 31));
  const jan1 = new Date(year, 0, 1);

  return Array.from({ length: totalWeeks }, (_, i) => {
    const w = i + 1;
    const wStart = new Date(jan1.getTime() + ((w - 1) * 7 - jan1.getDay()) * 86400000);
    const wEnd = new Date(wStart.getTime() + 7 * 86400000);

    const { paid, deposit, pending } = classifyNights(yearlyData, wStart, wEnd);
    const blocked = blockedByWeek.get(w) ?? 0;
    const free = Math.max(0, 7 - paid - deposit - pending - blocked);

    return { name: `T${w}`, paid, deposit, pending, blocked, free };
  });
}

// ---------------------------------------------------------------------------
// Alerty
// ---------------------------------------------------------------------------

async function fetchAlerts(now: Date): Promise<{
  upcomingCheckIns: { id: string; guestName: string; checkIn: Date; checkOut: Date; status: string; nights: number }[];
  alerts: Alert[];
}> {
  const in3Days = new Date(now.getTime() + 3 * 86400000);
  const in7Days = new Date(now.getTime() + 7 * 86400000);

  const [upcomingCheckIns, pendingCheckingSoon, depositSoon] = await Promise.all([
    prisma.reservation.findMany({
      where: { checkIn: { gte: now }, status: { notIn: ['CANCELLED'] } },
      orderBy: { checkIn: 'asc' },
      take: 3,
      select: { id: true, guestName: true, checkIn: true, checkOut: true, status: true, nights: true },
    }),
    prisma.reservation.findMany({
      where: { checkIn: { gte: now, lte: in3Days }, status: 'PENDING' },
      select: { id: true, guestName: true, checkIn: true },
    }),
    prisma.reservation.findMany({
      where: { checkIn: { gte: now, lte: in7Days }, status: 'DEPOSIT_PAID' },
      select: { id: true, guestName: true, checkIn: true },
    }),
  ]);

  const alerts: Alert[] = [];
  for (const r of pendingCheckingSoon) {
    const daysUntil = Math.ceil((r.checkIn.getTime() - now.getTime()) / 86400000);
    alerts.push({
      type: 'warning',
      message: `${r.guestName} — zameldowanie za ${daysUntil} dni, status: Oczekująca`,
      href: `/admin/reservations/${r.id}`,
    });
  }
  for (const r of depositSoon) {
    const daysUntil = Math.ceil((r.checkIn.getTime() - now.getTime()) / 86400000);
    alerts.push({
      type: 'info',
      message: `${r.guestName} — zameldowanie za ${daysUntil} dni, zaliczka opłacona`,
      href: `/admin/reservations/${r.id}`,
    });
  }

  return { upcomingCheckIns, alerts };
}

// ---------------------------------------------------------------------------
// Główna funkcja — getStats()
// ---------------------------------------------------------------------------

export async function getStats() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonthDay = new Date(year, now.getMonth() + 1, 1);
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const endOfYearDay = new Date(year + 1, 0, 1);

  // Wszystkie zapytania DB w jednym Promise.all (łącznie z alertami)
  const [
    statusCounts,
    totalReservations,
    totalSections,
    totalImages,
    allReservations,
    confirmedOverlappingMonth,
    confirmedOverlappingYear,
    yearlyChartData,
    blockedDatesYear,
    alertsData,
  ] = await Promise.all([
    prisma.reservation.groupBy({ by: ['status'], _count: true }),
    prisma.reservation.count(),
    prisma.section.count(),
    prisma.galleryImage.count(),
    prisma.reservation.findMany({
      where: {
        status: { not: 'CANCELLED' },
        checkIn: { gte: new Date(year - 2, 0, 1) },
      },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, createdAt: true, updatedAt: true, status: true },
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        checkIn: { lt: endOfMonthDay },
        checkOut: { gte: startOfMonth },
      },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true },
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        checkIn: { lt: endOfYearDay },
        checkOut: { gte: startOfYear },
      },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true },
    }),
    prisma.reservation.findMany({
      where: { checkIn: { gte: startOfYear, lte: endOfYear } },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, status: true },
    }),
    prisma.blockedDate.findMany({
      where: { date: { gte: startOfYear, lte: endOfYear } },
      select: { date: true, type: true },
    }),
    fetchAlerts(now),
  ]);

  // Status counts
  const countByStatus = (s: string) => statusCounts.find((r) => r.status === s)?._count ?? 0;
  const pendingReservations = countByStatus('PENDING');
  const depositPaid = countByStatus('DEPOSIT_PAID');
  const paidReservations = countByStatus('PAID');
  const cancelledReservations = countByStatus('CANCELLED');
  const completedReservations = countByStatus('COMPLETED');

  // Przychód i obłożenie (miesiąc + rok)
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthly = computeRevenueAndOccupancy(confirmedOverlappingMonth, startOfMonth, endOfMonthDay);
  const yearly = computeRevenueAndOccupancy(confirmedOverlappingYear, startOfYear, endOfYearDay);

  const monthlyOccupancy = daysInMonth > 0 ? Math.min(100, Math.round((monthly.nights / daysInMonth) * 100)) : 0;
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const yearlyOccupancy = dayOfYear > 0 ? Math.min(100, Math.round((yearly.nights / dayOfYear) * 100)) : 0;

  // KPI (single pass over allReservations)
  const kpis = computeKpis(allReservations, statusCounts, totalReservations, now);

  // Wykresy (pre-grouped blocked dates)
  const blockedByMonth = groupBlockedByMonth(blockedDatesYear);
  const blockedByWeek = groupBlockedByWeek(blockedDatesYear, year);
  const monthlyChart = buildMonthlyChart(yearlyChartData, blockedByMonth, year);
  const weeklyChart = buildWeeklyChart(yearlyChartData, blockedByWeek, year);

  return {
    totalReservations,
    pendingReservations,
    depositPaid,
    paidReservations,
    cancelledReservations,
    completedReservations,
    totalSections,
    totalImages,
    monthlyRevenue: monthly.revenue,
    yearlyRevenue: yearly.revenue,
    monthlyOccupancy,
    yearlyOccupancy,
    ...kpis,
    monthlyChart,
    weeklyChart,
    currentYear: year,
    ...alertsData,
  };
}
