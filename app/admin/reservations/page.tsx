export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Oczekująca', variant: 'outline' },
  DEPOSIT_PAID: { label: 'Zaliczka', variant: 'secondary' },
  PAID: { label: 'Opłacona', variant: 'default' },
  CANCELLED: { label: 'Anulowana', variant: 'destructive' },
  COMPLETED: { label: 'Zakończona', variant: 'secondary' },
};

async function getReservations() {
  return prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

async function getStats() {
  const [total, pending, upcoming] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({
      where: { checkIn: { gte: new Date() }, status: { notIn: ['CANCELLED'] } },
    }),
  ]);
  return { total, pending, upcoming };
}

export default async function ReservationsPage() {
  const [reservations, stats] = await Promise.all([
    getReservations(),
    getStats(),
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Rezerwacje</h1>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Łącznie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Oczekujące</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nadchodzące</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{stats.upcoming}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gość</TableHead>
                  <TableHead>Zameldowanie</TableHead>
                  <TableHead>Wymeldowanie</TableHead>
                  <TableHead>Noce</TableHead>
                  <TableHead>Goście</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data zgł.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Brak rezerwacji
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((r) => {
                    const status = STATUS_LABELS[r.status] || { label: r.status, variant: 'outline' as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link
                            href={`/admin/reservations/${r.id}`}
                            className="font-medium hover:underline"
                          >
                            {r.guestName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{r.guestEmail}</p>
                        </TableCell>
                        <TableCell>{format(r.checkIn, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{format(r.checkOut, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{r.nights}</TableCell>
                        <TableCell>{r.guests}</TableCell>
                        <TableCell className="font-medium">{r.totalPrice} zł</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(r.createdAt, 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
