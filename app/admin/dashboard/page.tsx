export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReservationsChart } from './ReservationsChart';
import { ExternalStatsCards } from './ExternalStatsCards';
import { getExternalStats } from '@/lib/external-stats';

const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

function getWeekOfYear(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);
}

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  const [
    statusCounts,
    totalReservations,
    totalSections,
    totalImages,
    allReservations,
    monthlyReservations,
    yearlyReservations,
    yearlyChartData,
    blockedDatesYear,
  ] = await Promise.all([
    prisma.reservation.groupBy({ by: ['status'], _count: true }),
    prisma.reservation.count(),
    prisma.section.count(),
    prisma.galleryImage.count(),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { checkIn: true, checkOut: true, nights: true, totalPrice: true, createdAt: true, updatedAt: true, status: true },
    }),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, checkIn: { gte: startOfMonth } },
      select: { totalPrice: true, nights: true },
    }),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, checkIn: { gte: startOfYear } },
      select: { totalPrice: true, nights: true },
    }),
    prisma.reservation.findMany({
      where: { checkIn: { gte: startOfYear, lte: endOfYear } },
      select: { checkIn: true, nights: true, totalPrice: true, status: true },
    }),
    prisma.blockedDate.findMany({
      where: { date: { gte: startOfYear, lte: endOfYear } },
      select: { date: true },
    }),
  ]);

  const countByStatus = (s: string) => statusCounts.find((r) => r.status === s)?._count ?? 0;
  const pendingReservations = countByStatus('PENDING');
  const depositPaid = countByStatus('DEPOSIT_PAID');
  const paidReservations = countByStatus('PAID');
  const cancelledReservations = countByStatus('CANCELLED');
  const completedReservations = countByStatus('COMPLETED');

  // Przychód
  const monthlyRevenue = monthlyReservations.reduce((sum, r) => sum + r.totalPrice, 0);
  const yearlyRevenue = yearlyReservations.reduce((sum, r) => sum + r.totalPrice, 0);

  // Obłożenie — % nocy zajętych w bieżącym miesiącu
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyNights = monthlyReservations.reduce((sum, r) => sum + r.nights, 0);
  const monthlyOccupancy = daysInMonth > 0 ? Math.round((monthlyNights / daysInMonth) * 100) : 0;

  // Obłożenie roczne
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const yearlyNights = yearlyReservations.reduce((sum, r) => sum + r.nights, 0);
  const yearlyOccupancy = dayOfYear > 0 ? Math.round((yearlyNights / dayOfYear) * 100) : 0;

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

  type ChartPoint = {
    name: string;
    PENDING: number;
    DEPOSIT_PAID: number;
    PAID: number;
    COMPLETED: number;
    CANCELLED: number;
    BLOCKED: number;
  };

  const emptyPoint = (): Omit<ChartPoint, 'name'> => ({ PENDING: 0, DEPOSIT_PAID: 0, PAID: 0, COMPLETED: 0, CANCELLED: 0, BLOCKED: 0 });

  // Dane miesięczne dla wykresu
  const monthlyChart: ChartPoint[] = MONTH_NAMES.map((name, i) => {
    const res = yearlyChartData.filter((r) => new Date(r.checkIn).getMonth() === i);
    const pt = emptyPoint();
    for (const r of res) pt[r.status as keyof typeof pt]++;
    pt.BLOCKED = blockedDatesYear.filter((b) => new Date(b.date).getMonth() === i).length;
    return { name, ...pt };
  });

  // Dane tygodniowe dla wykresu
  const totalWeeks = getWeekOfYear(new Date(now.getFullYear(), 11, 31));
  const weekMap = new Map<number, Omit<ChartPoint, 'name'>>();
  for (const r of yearlyChartData) {
    const w = getWeekOfYear(new Date(r.checkIn));
    const cur = weekMap.get(w) ?? emptyPoint();
    cur[r.status as keyof typeof cur]++;
    weekMap.set(w, cur);
  }
  for (const b of blockedDatesYear) {
    const w = getWeekOfYear(new Date(b.date));
    const cur = weekMap.get(w) ?? emptyPoint();
    cur.BLOCKED++;
    weekMap.set(w, cur);
  }
  const weeklyChart: ChartPoint[] = Array.from({ length: totalWeeks }, (_, i) => {
    const w = i + 1;
    return { name: `T${w}`, ...(weekMap.get(w) ?? emptyPoint()) };
  });

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
    monthlyChart,
    weeklyChart,
    currentYear: now.getFullYear(),
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Łącznie" value={s.totalReservations} />
            <StatCard title="Oczekujące" value={s.pendingReservations} variant={s.pendingReservations > 0 ? 'warning' : 'default'} />
            <StatCard title="Zaliczka" value={s.depositPaid} />
            <StatCard title="Opłacone" value={s.paidReservations} variant="success" />
            <StatCard title="Zrealizowane" value={s.completedReservations} />
            <StatCard title="Anulowane" value={s.cancelledReservations} variant={s.cancelledReservations > 0 ? 'destructive' : 'default'} />
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Śr. czas odpowiedzi" value={`${s.avgResponseHours}h`} desc="Od zgłoszenia do zmiany statusu" />
          <StatCard title="Sekcje treści" value={s.totalSections} />
          <StatCard title="Zdjęcia w galerii" value={s.totalImages} />
        </div>

        {/* Wykres rezerwacji */}
        <ReservationsChart
          monthlyData={s.monthlyChart}
          weeklyData={s.weeklyChart}
          year={s.currentYear}
        />

        {/* Vercel & Neon */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Infrastruktura</h2>
          <ExternalStatsCards stats={externalStats} />
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  desc,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  desc?: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const badgeVariant = variant === 'default' ? undefined : variant === 'success' ? 'default' : variant;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold flex items-center gap-2">
          {value}
          {variant !== 'default' && badgeVariant && (
            <Badge variant={badgeVariant as 'default' | 'destructive'} className="text-[10px]">
              {variant === 'warning' ? '!' : variant === 'success' ? '✓' : '✕'}
            </Badge>
          )}
        </p>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </CardContent>
    </Card>
  );
}
