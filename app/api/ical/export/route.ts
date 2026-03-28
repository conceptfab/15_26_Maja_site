import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ICAL_TOKEN = process.env.ICAL_EXPORT_TOKEN;

function escapeIcal(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET(request: NextRequest) {
  // Opcjonalne zabezpieczenie tokenem
  if (ICAL_TOKEN) {
    const token = request.nextUrl.searchParams.get('token');
    if (token !== ICAL_TOKEN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
  const reservations = await prisma.reservation.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { id: true, guestName: true, checkIn: true, checkOut: true, status: true, guests: true, createdAt: true },
    orderBy: { checkIn: 'asc' },
  });

  const blockedDates = await prisma.blockedDate.findMany({
    select: { id: true, date: true, reason: true },
    orderBy: { date: 'asc' },
  });

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HOMMM//Reservation Calendar//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:HOMMM Rezerwacje',
  ];

  for (const r of reservations) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@hommm`,
      `DTSTART;VALUE=DATE:${r.checkIn.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${r.checkOut.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${escapeIcal(r.guestName)} (${r.guests} os.)`,
      `DESCRIPTION:Status: ${r.status}`,
      `DTSTAMP:${formatDate(r.createdAt)}`,
      'END:VEVENT',
    );
  }

  for (const b of blockedDates) {
    const nextDay = new Date(b.date);
    nextDay.setDate(nextDay.getDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:blocked-${b.id}@hommm`,
      `DTSTART;VALUE=DATE:${b.date.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${nextDay.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${escapeIcal(b.reason || 'Zablokowana')}`,
      `DTSTAMP:${formatDate(b.date)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hommm-calendar.ics"',
    },
  });
}
