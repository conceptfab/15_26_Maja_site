export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { AdminShell } from '@/components/admin/AdminShell';
import { ReservationsClient } from './ReservationsClient';

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
  const stats = await getStats();

  return (
    <AdminShell>
      <ReservationsClient initialStats={stats} />
    </AdminShell>
  );
}
