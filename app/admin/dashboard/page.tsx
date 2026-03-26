export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getStats() {
  const [
    totalReservations,
    pendingReservations,
    totalSections,
    totalImages,
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.section.count(),
    prisma.galleryImage.count(),
  ]);

  return { totalReservations, pendingReservations, totalSections, totalImages };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      title: 'Rezerwacje',
      value: stats.totalReservations,
      description: 'Łącznie',
    },
    {
      title: 'Oczekujące',
      value: stats.pendingReservations,
      description: 'Do zatwierdzenia',
    },
    {
      title: 'Sekcje',
      value: stats.totalSections,
      description: 'Treści na stronie',
    },
    {
      title: 'Zdjęcia',
      value: stats.totalImages,
      description: 'W galerii',
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
