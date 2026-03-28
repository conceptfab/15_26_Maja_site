import { NextResponse } from 'next/server';
import { differenceInCalendarDays, format } from 'date-fns';
import { prisma } from '@/lib/db';
import { reservationSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  sendEmail,
  buildGuestConfirmationEmail,
  buildAdminNotificationEmail,
  loadEmailContext,
} from '@/lib/mail';

const PRICE_PER_NIGHT = 204.5;

export async function POST(request: Request) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const { allowed, retryAfterMs } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, comment } = parsed.data;

    const nights = differenceInCalendarDays(checkOut, checkIn);

    let reservation;
    try {
      reservation = await prisma.$transaction(async (tx) => {
        // Sprawdź dostępność — czy nie ma nakładających się rezerwacji
        const overlapping = await tx.reservation.findFirst({
          where: {
            status: { notIn: ['CANCELLED'] },
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        });

        if (overlapping) {
          throw Object.assign(new Error('Wybrany termin jest niedostępny'), { statusCode: 409 });
        }

        // Sprawdź zablokowane daty
        const blockedDate = await tx.blockedDate.findFirst({
          where: {
            date: { gte: checkIn, lt: checkOut },
          },
        });

        if (blockedDate) {
          throw Object.assign(new Error('Wybrany termin jest zablokowany'), { statusCode: 409 });
        }

        // Pobierz aktualną cenę z ustawień
        const settings = await tx.siteSettings.findUnique({ where: { key: 'general' } });
        const pricePerNight: number =
          (settings?.value as Record<string, number> | null)?.pricePerNight ?? PRICE_PER_NIGHT;
        const totalPrice = Math.round(nights * pricePerNight);

        return tx.reservation.create({
          data: {
            guestName,
            guestEmail,
            guestPhone,
            checkIn,
            checkOut,
            guests,
            nights,
            totalPrice,
            comment: comment || null,
          },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd serwera';
      const code = (err as { statusCode?: number }).statusCode ?? 500;
      if (code !== 500) {
        return NextResponse.json({ error: msg }, { status: code });
      }
      throw err;
    }

    // Emaile — fire & forget, nie blokujemy odpowiedzi
    const emailData = {
      guestName,
      guestEmail,
      guestPhone,
      checkIn: format(checkIn, 'dd.MM.yyyy'),
      checkOut: format(checkOut, 'dd.MM.yyyy'),
      nights,
      guests,
      totalPrice: reservation.totalPrice,
      comment,
    };

    const adminAddress = process.env.ADMIN_EMAIL || 'admin@hommm.eu';

    // Ładujemy templates raz, przekazujemy do obu funkcji
    loadEmailContext().then(async (ctx) => {
      const [guestTmpl, adminTmpl] = await Promise.all([
        buildGuestConfirmationEmail(emailData, ctx),
        buildAdminNotificationEmail(emailData, ctx),
      ]);
      await Promise.allSettled([
        sendEmail({ to: guestEmail, ...guestTmpl }),
        sendEmail({ to: adminAddress, ...adminTmpl }),
      ]);
    }).catch(() => {});

    return NextResponse.json(
      { success: true, id: reservation.id },
      { status: 201 },
    );
  } catch (error) {
    console.error('[reservations] POST error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 },
    );
  }
}
