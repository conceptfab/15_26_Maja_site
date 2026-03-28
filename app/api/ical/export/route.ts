import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ICAL_TOKEN = process.env.ICAL_EXPORT_TOKEN;

function escapeIcal(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

function formatDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET(request: NextRequest) {
  // Zabezpieczenie tokenem — wymagany header Authorization: Bearer ...
  if (!ICAL_TOKEN) {
    return new NextResponse('iCal export not configured (ICAL_EXPORT_TOKEN missing)', { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (headerToken !== ICAL_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
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
    // iCal DTEND jest exclusive (RFC 5545), a checkOut to ostatni dzień pobytu (inclusive)
    const icalEnd = new Date(r.checkOut);
    icalEnd.setDate(icalEnd.getDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@hommm`,
      `DTSTART;VALUE=DATE:${r.checkIn.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${icalEnd.toISOString().slice(0, 10).replace(/-/g, '')}`,
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
