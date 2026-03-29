export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReservationsChart } from './ReservationsChart';
import { InfrastructureSection } from './InfrastructureSection';
import { getExternalStats } from '@/lib/external-stats';
import { getStats } from '@/lib/dashboard-stats';
import { formatPLN } from '@/lib/format';

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
