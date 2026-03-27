export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalReservations,
    pendingReservations,
    depositPaid,
    paidReservations,
    cancelledReservations,
    completedReservations,
    totalSections,
    totalImages,
    allReservations,
    monthlyReservations,
    yearlyReservations,
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({ where: { status: 'DEPOSIT_PAID' } }),
    prisma.reservation.count({ where: { status: 'PAID' } }),
    prisma.reservation.count({ where: { status: 'CANCELLED' } }),
    prisma.reservation.count({ where: { status: 'COMPLETED' } }),
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
  ]);

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
  };
}

function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(amount);
}

export default async function DashboardPage() {
  const s = await getStats();

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

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
