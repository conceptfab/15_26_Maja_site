'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  DEPOSIT_PAID: 'Zaliczka',
  PAID: 'Opłacona',
  COMPLETED: 'Zakończona',
  CANCELLED: 'Anulowana',
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl;
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search') || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestEmail: { contains: search, mode: 'insensitive' } },
      { guestPhone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['Imię', 'Email', 'Telefon', 'Zameldowanie', 'Wymeldowanie', 'Noce', 'Goście', 'Cena', 'Status', 'Data zgłoszenia'];
  const rows = reservations.map((r) => [
    escapeCsv(r.guestName),
    escapeCsv(r.guestEmail),
    escapeCsv(r.guestPhone || ''),
    format(r.checkIn, 'yyyy-MM-dd'),
    format(r.checkOut, 'yyyy-MM-dd'),
    String(r.nights),
    String(r.guests),
    String(r.totalPrice),
    STATUS_LABELS[r.status] || r.status,
    format(r.createdAt, 'yyyy-MM-dd HH:mm'),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Excel

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rezerwacje-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    },
  });
}
