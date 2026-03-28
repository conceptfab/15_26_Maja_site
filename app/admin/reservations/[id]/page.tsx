export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ReservationActions } from './ReservationActions';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Oczekująca', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  DEPOSIT_PAID: { label: 'Zaliczka', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  PAID: { label: 'Opłacona', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Anulowana', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  COMPLETED: { label: 'Zakończona', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) notFound();

  const status = STATUS_CONFIG[reservation.status] || { label: reservation.status, className: '' };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Rezerwacja</h1>
          <Badge className={`text-sm ${status.className}`}>{status.label}</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dane gościa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-lg">{reservation.guestName}</p>
              <p className="text-sm">
                <a href={`mailto:${reservation.guestEmail}`} className="text-blue-400 hover:underline">
                  {reservation.guestEmail}
                </a>
              </p>
              {reservation.guestPhone && (
                <p className="text-sm">
                  <a href={`tel:${reservation.guestPhone}`} className="text-blue-400 hover:underline">
                    {reservation.guestPhone}
                  </a>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Szczegóły pobytu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zameldowanie</span>
                <span className="font-medium">{format(reservation.checkIn, 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wymeldowanie</span>
                <span className="font-medium">{format(reservation.checkOut, 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Noce</span>
                <span className="font-medium">{reservation.nights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goście</span>
                <span className="font-medium">{reservation.guests}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">Cena</span>
                <span className="font-bold text-base">{reservation.totalPrice} zł</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {reservation.comment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Komentarz gościa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{reservation.comment}</p>
            </CardContent>
          </Card>
        )}

        <ReservationActions
          id={reservation.id}
          currentStatus={reservation.status}
          adminNote={reservation.adminNote}
          checkIn={reservation.checkIn.toISOString()}
          checkOut={reservation.checkOut.toISOString()}
          guests={reservation.guests}
          totalPrice={reservation.totalPrice}
        />

        <p className="text-xs text-muted-foreground">
          Utworzono: {format(reservation.createdAt, 'dd.MM.yyyy HH:mm')} |
          Aktualizacja: {format(reservation.updatedAt, 'dd.MM.yyyy HH:mm')}
        </p>
      </div>
    </AdminShell>
  );
}
