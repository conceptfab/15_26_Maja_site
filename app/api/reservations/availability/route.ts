import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toDateString } from '@/lib/date-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Domyślnie: 3 miesiące do przodu, max 12 miesięcy
    const startDate = from ? new Date(from) : new Date();
    const maxEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const requestedEnd = to
      ? new Date(to)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const endDate = requestedEnd > maxEnd ? maxEnd : requestedEnd;

    // Rezerwacje aktywne w tym okresie
    const reservations = await prisma.reservation.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        checkIn: { lt: endDate },
        checkOut: { gte: startDate },
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
    });

    // Zablokowane daty w tym okresie
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      select: {
        date: true,
        reason: true,
      },
    });

    return NextResponse.json({
      reservations: reservations.map((r) => ({
        checkIn: toDateString(r.checkIn),
        checkOut: toDateString(r.checkOut),
      })),
      blockedDates: blockedDates.map((b) => ({
        date: toDateString(b.date),
        reason: b.reason,
      })),
    });
  } catch (error) {
    console.error('[availability] GET error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 },
    );
  }
}
