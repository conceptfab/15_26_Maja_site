import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { addDays } from 'date-fns';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in48h = addDays(now, 2);

  const [pendingReservations, upcomingCheckIns48h] = await Promise.all([
    prisma.reservation.count({
      where: { status: 'PENDING' },
    }),
    prisma.reservation.count({
      where: {
        checkIn: { gte: now, lte: in48h },
        status: { notIn: ['CANCELLED'] },
      },
    }),
  ]);

  return NextResponse.json({ pendingReservations, upcomingCheckIns48h });
}
