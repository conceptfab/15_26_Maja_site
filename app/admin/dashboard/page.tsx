export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ReservationsChart } from './ReservationsChart';
import { InfrastructureSection } from './InfrastructureSection';
import { getExternalStats } from '@/lib/external-stats';

const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

function getWeekOfYear(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);
}

import { overlapNights } from '@/lib/date-utils';

const CONFIRMED_STATUSES = ['DEPOSIT_PAID', 'PAID', 'COMPLETED'] as const;

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const endOfMonthDay = new Date(now.getFullYear(), now.getMonth() + 1, 1); // dzień po ostatnim dniu miesiąca (dla overlap)
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const endOfYearDay = new Date(now.getFullYear() + 1, 0, 1);

  const [
    statusCounts,
    totalReservations,
    totalSections,
    totalImages,
    allReservations, // ograniczone do 2 lat wstecz
    confirmedOverlappingMonth,
    confirmedOverlappingYear,
    yearlyChartData,
    blockedDatesYear,
  ] = await Promise.all([
    prisma.reservation.groupBy({ by: ['status'], _count: true }),
    prisma.reservation.count(),
    prisma.section.count(),
    prisma.galleryImage.count(),
    prisma.reservation.findMany({
      where: {
        status: { not: 'CANCELLED' },
        checkIn: { gte: new Date(now.getFullYear() - 2, 0, 1) },
      },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, createdAt: true, updatedAt: true, status: true },
    }),
    // Rezerwacje potwierdzone zachodzące na bieżący miesiąc
    prisma.reservation.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        checkIn: { lt: endOfMonthDay },
        checkOut: { gt: startOfMonth },
      },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true },
    }),
    // Rezerwacje potwierdzone zachodzące na bieżący rok
    prisma.reservation.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        checkIn: { lt: endOfYearDay },
        checkOut: { gt: startOfYear },
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
  ]);

  const countByStatus = (s: string) => statusCounts.find((r) => r.status === s)?._count ?? 0;
  const pendingReservations = countByStatus('PENDING');
  const depositPaid = countByStatus('DEPOSIT_PAID');
  const paidReservations = countByStatus('PAID');
  const cancelledReservations = countByStatus('CANCELLED');
  const completedReservations = countByStatus('COMPLETED');

  // Przychód proporcjonalny do nocy w danym okresie
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  let monthlyRevenue = 0;
  let monthlyNights = 0;
  for (const r of confirmedOverlappingMonth) {
    const nights = overlapNights(r.checkIn, r.checkOut, startOfMonth, endOfMonthDay);
    monthlyNights += nights;
    monthlyRevenue += r.nights > 0 ? r.totalPrice * (nights / r.nights) : 0;
  }

  let yearlyRevenue = 0;
  let yearlyNights = 0;
  for (const r of confirmedOverlappingYear) {
    const nights = overlapNights(r.checkIn, r.checkOut, startOfYear, endOfYearDay);
    yearlyNights += nights;
    yearlyRevenue += r.nights > 0 ? r.totalPrice * (nights / r.nights) : 0;
  }

  // Obłożenie — cap na 100%
  const monthlyOccupancy = daysInMonth > 0 ? Math.min(100, Math.round((monthlyNights / daysInMonth) * 100)) : 0;

  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const yearlyOccupancy = dayOfYear > 0 ? Math.min(100, Math.round((yearlyNights / dayOfYear) * 100)) : 0;

  // Średni czas odpowiedzi admina (czas od createdAt do updatedAt dla rezerwacji, które zmieniły status z PENDING)
  const respondedReservations = allReservations.filter(
    (r) => r.status !== 'PENDING' && r.updatedAt.getTime() > r.createdAt.getTime()
  );
  const avgResponseHours = respondedReservations.length > 0
    ? Math.round(
        respondedReservations.reduce(
          (sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()),
          0
        ) / respondedReservations.length / (1000 * 60 * 60)
      )
    : 0;

  type OccupancyChartPoint = {
    name: string;
    paid: number;       // dni opłacone (PAID + COMPLETED)
    deposit: number;    // dni z zaliczką (DEPOSIT_PAID)
    pending: number;    // dni oczekujące (PENDING)
    blocked: number;    // dni zablokowane
    free: number;       // dni wolne
  };

  // Dane miesięczne dla wykresu obłożenia (dni)
  const monthlyChart: OccupancyChartPoint[] = MONTH_NAMES.map((name, monthIdx) => {
    const mStart = new Date(now.getFullYear(), monthIdx, 1);
    const mEnd = new Date(now.getFullYear(), monthIdx + 1, 1);
    const daysInM = new Date(now.getFullYear(), monthIdx + 1, 0).getDate();

    let paid = 0;
    let deposit = 0;
    let pending = 0;
    for (const r of yearlyChartData) {
      const nights = overlapNights(r.checkIn, r.checkOut, mStart, mEnd);
      if (nights <= 0) continue;
      if (['PAID', 'COMPLETED'].includes(r.status)) {
        paid += nights;
      } else if (r.status === 'DEPOSIT_PAID') {
        deposit += nights;
      } else if (r.status === 'PENDING') {
        pending += nights;
      }
    }
    const blocked = blockedDatesYear.filter((b) => new Date(b.date).getMonth() === monthIdx).length;
    const free = Math.max(0, daysInM - paid - deposit - pending - blocked);

    return { name, paid, deposit, pending, blocked, free };
  });

  // Dane tygodniowe — uproszczone (bez overlap, bo tydzień = 7 dni)
  const totalWeeks = getWeekOfYear(new Date(now.getFullYear(), 11, 31));
  const weeklyChart: OccupancyChartPoint[] = Array.from({ length: totalWeeks }, (_, i) => {
    const w = i + 1;
    // Oblicz start/end tygodnia
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const wStart = new Date(jan1.getTime() + ((w - 1) * 7 - jan1.getDay()) * 86400000);
    const wEnd = new Date(wStart.getTime() + 7 * 86400000);

    let paid = 0;
    let deposit = 0;
    let pendingDays = 0;
    for (const r of yearlyChartData) {
      const nights = overlapNights(r.checkIn, r.checkOut, wStart, wEnd);
      if (nights <= 0) continue;
      if (['PAID', 'COMPLETED'].includes(r.status)) {
        paid += nights;
      } else if (r.status === 'DEPOSIT_PAID') {
        deposit += nights;
      } else if (r.status === 'PENDING') {
        pendingDays += nights;
      }
    }
    const blocked = blockedDatesYear.filter((b) => {
      const bd = new Date(b.date);
      return bd >= wStart && bd < wEnd;
    }).length;
    const free = Math.max(0, 7 - paid - deposit - pendingDays - blocked);

    return { name: `T${w}`, paid, deposit, pending: pendingDays, blocked, free };
  });

  // Nowe KPI (B2)
  const confirmedAll = allReservations.filter((r) =>
    ['DEPOSIT_PAID', 'PAID', 'COMPLETED'].includes(r.status)
  );
  const totalConfirmedNights = confirmedAll.reduce((s, r) => s + r.nights, 0);
  const totalConfirmedRevenue = confirmedAll.reduce((s, r) => s + r.totalPrice, 0);
  const avgPricePerNight = totalConfirmedNights > 0 ? Math.round(totalConfirmedRevenue / totalConfirmedNights) : 0;
  const avgStayLength = confirmedAll.length > 0 ? +(totalConfirmedNights / confirmedAll.length).toFixed(1) : 0;
  const conversionRate = totalReservations > 0
    ? Math.round((statusCounts.filter((r) => ['PAID', 'COMPLETED'].includes(r.status)).reduce((s, r) => s + r._count, 0) / totalReservations) * 100)
    : 0;
  const cancellationRate = totalReservations > 0
    ? Math.round((cancelledReservations / totalReservations) * 100)
    : 0;

  // Przychód prognozowany (przyszłe rezerwacje z zaliczką)
  const forecastedRevenue = allReservations
    .filter((r) => r.status === 'DEPOSIT_PAID' && r.checkIn > now)
    .reduce((s, r) => s + r.totalPrice, 0);

  // Nadchodzące w 7 dni
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const upcoming7Days = allReservations.filter(
    (r) => r.checkIn >= now && r.checkIn <= in7Days && r.status !== 'CANCELLED'
  ).length;

  // Nadchodzące zameldowania (3 najbliższe)
  const upcomingCheckIns = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: now },
      status: { notIn: ['CANCELLED'] },
    },
    orderBy: { checkIn: 'asc' },
    take: 3,
    select: { id: true, guestName: true, checkIn: true, checkOut: true, status: true, nights: true },
  });

  // Alerty — rezerwacje w ciągu 3 dni bez wpłaty zaliczki
  const in3Days = new Date(now.getTime() + 3 * 86400000);
  const alerts: { type: string; message: string; href: string }[] = [];
  const pendingCheckingSoon = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: now, lte: in3Days },
      status: 'PENDING',
    },
    select: { id: true, guestName: true, checkIn: true },
  });
  for (const r of pendingCheckingSoon) {
    const daysUntil = Math.ceil((r.checkIn.getTime() - now.getTime()) / 86400000);
    alerts.push({
      type: 'warning',
      message: `${r.guestName} — zameldowanie za ${daysUntil} dni, status: Oczekująca`,
      href: `/admin/reservations/${r.id}`,
    });
  }

  const depositSoon = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: now, lte: in7Days },
      status: 'DEPOSIT_PAID',
    },
    select: { id: true, guestName: true, checkIn: true },
  });
  for (const r of depositSoon) {
    const daysUntil = Math.ceil((r.checkIn.getTime() - now.getTime()) / 86400000);
    alerts.push({
      type: 'info',
      message: `${r.guestName} — zameldowanie za ${daysUntil} dni, zaliczka opłacona`,
      href: `/admin/reservations/${r.id}`,
    });
  }

  return {
    totalReservations,
    pendingReservations,
    depositPaid,
    paidReservations,
    cancelledReservations,
    completedReservations,
    totalSections,
    totalImages,
    monthlyRevenue,
    yearlyRevenue,
    monthlyOccupancy,
    yearlyOccupancy,
    avgResponseHours,
    avgPricePerNight,
    avgStayLength,
    conversionRate,
    cancellationRate,
    forecastedRevenue,
    upcoming7Days,
    monthlyChart,
    weeklyChart,
    currentYear: now.getFullYear(),
    upcomingCheckIns,
    alerts,
  };
}

function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(amount);
}

export default async function DashboardPage() {
  const [s, externalStats] = await Promise.all([getStats(), getExternalStats()]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Alert oczekujących */}
        {s.pendingReservations > 0 && (
          <a href="/admin/reservations" className="block">
            <div className="rounded-lg border-2 border-amber-500 bg-amber-500/10 px-5 py-4 flex items-center gap-4 animate-pulse hover:bg-amber-500/20 transition-colors">
              <span className="text-3xl">🔔</span>
              <div>
                <p className="font-bold text-amber-400 text-base">
                  {s.pendingReservations === 1
                    ? 'Masz 1 nową rezerwację do rozpatrzenia!'
                    : `Masz ${s.pendingReservations} nowe rezerwacje do rozpatrzenia!`}
                </p>
                <p className="text-xs text-amber-400/70 mt-0.5">Kliknij, aby przejść do listy rezerwacji →</p>
              </div>
            </div>
          </a>
        )}

        {/* Rezerwacje wg statusu */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Rezerwacje</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {s.upcoming7Days > 0 && (
              <StatCard title="Nadchodzące (7 dni)" value={s.upcoming7Days} desc="Zameldowania w ciągu tygodnia" />
            )}
            <StatCard title="Łącznie" value={s.totalReservations} />
            <StatCard title="Oczekujące" value={s.pendingReservations} />
            <StatCard title="Zaliczka" value={s.depositPaid} />
            <StatCard title="Opłacone" value={s.paidReservations} />
            <StatCard title="Zrealizowane" value={s.completedReservations} />
            <StatCard title="Anulowane" value={s.cancelledReservations} />
          </div>
        </div>

        {/* KPI */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Wskaźniki KPI</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Przychód (miesiąc)" value={formatPLN(s.monthlyRevenue)} desc="Bieżący miesiąc" />
            <StatCard title="Przychód (rok)" value={formatPLN(s.yearlyRevenue)} desc="Od początku roku" />
            <StatCard title="Obłożenie (miesiąc)" value={`${s.monthlyOccupancy}%`} desc="% zajętych nocy" />
            <StatCard title="Obłożenie (rok)" value={`${s.yearlyOccupancy}%`} desc="% zajętych nocy" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mt-4">
            <StatCard title="Śr. cena/noc" value={formatPLN(s.avgPricePerNight)} desc="Potwierdzone rezerwacje" />
            <StatCard title="Śr. długość pobytu" value={`${s.avgStayLength} nocy`} desc="Potwierdzone rezerwacje" />
            <StatCard title="Konwersja" value={`${s.conversionRate}%`} desc="Opłacone / wszystkie" />
            <StatCard title="Anulacje" value={`${s.cancellationRate}%`} desc="Anulowane / wszystkie" />
            <StatCard title="Prognozowany przychód" value={formatPLN(s.forecastedRevenue)} desc="Przyszłe z zaliczką" />
            <StatCard title="Śr. czas odpowiedzi" value={`${s.avgResponseHours}h`} desc="Od zgłoszenia do zmiany statusu" />
          </div>
        </div>

        {/* Wykres rezerwacji */}
        <ReservationsChart
          monthlyData={s.monthlyChart}
          weeklyData={s.weeklyChart}
          year={s.currentYear}
        />

        {/* Nadchodzące zameldowania i alerty */}
        {(s.upcomingCheckIns.length > 0 || s.alerts.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {s.upcomingCheckIns.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Nadchodzące zameldowania</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {s.upcomingCheckIns.map((r) => (
                    <a key={r.id} href={`/admin/reservations/${r.id}`} className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
                      <div>
                        <span className="font-medium">{r.guestName}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{r.nights} nocy</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.checkIn.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                      </span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {s.alerts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Alerty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {s.alerts.map((alert, i) => (
                    <a key={i} href={alert.href} className={`block text-sm rounded px-2 py-1.5 transition-colors hover:opacity-80 ${alert.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {alert.message}
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vercel & Neon — widok deweloperski */}
        <InfrastructureSection stats={externalStats} />
      </div>
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  desc,
}: {
  title: string;
  value: string | number;
  desc?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">
          {value}
        </p>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </CardContent>
    </Card>
  );
}
