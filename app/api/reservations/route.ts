import { NextResponse } from 'next/server';
import { differenceInCalendarDays, format } from 'date-fns';
import { prisma } from '@/lib/db';
import { reservationSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { calculatePrice } from '@/lib/pricing';
import { getSettings } from '@/actions/settings';
import { getActivePricingRules } from '@/actions/pricing';
import {
  sendEmail,
  buildGuestConfirmationEmail,
  buildAdminNotificationEmail,
  loadEmailContext,
} from '@/lib/mail';

export async function POST(request: Request) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
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
    const settings = await getSettings();

    // Walidacja minimalnego pobytu
    if (nights < settings.minNights) {
      return NextResponse.json(
        { error: `Minimalny pobyt to ${settings.minNights} noce` },
        { status: 400 },
      );
    }

    // Walidacja maksymalnej liczby gości
    if (guests > settings.maxGuests) {
      return NextResponse.json(
        { error: `Maksymalna liczba gości to ${settings.maxGuests}` },
        { status: 400 },
      );
    }

    const pricingRules = await getActivePricingRules();
    const { totalPrice, depositAmount } = calculatePrice(checkIn, checkOut, settings, pricingRules);

    let reservation;
    try {
      reservation = await prisma.$transaction(async (tx) => {
        // Sprawdź dostępność — czy nie ma nakładających się rezerwacji
        const overlapping = await tx.reservation.findFirst({
          where: {
            status: { notIn: ['CANCELLED'] },
            checkIn: { lte: checkOut },
            checkOut: { gte: checkIn },
          },
        });

        if (overlapping) {
          throw Object.assign(new Error('Wybrany termin jest niedostępny'), { statusCode: 409 });
        }

        // Sprawdź zablokowane daty
        const blockedDate = await tx.blockedDate.findFirst({
          where: {
            date: { gte: checkIn, lte: checkOut },
          },
        });

        if (blockedDate) {
          throw Object.assign(new Error('Wybrany termin jest zablokowany'), { statusCode: 409 });
        }

        // findOrCreate klienta
        const client = await tx.client.upsert({
          where: { email: guestEmail },
          update: { name: guestName, phone: guestPhone || undefined },
          create: { email: guestEmail, name: guestName, phone: guestPhone || undefined },
        });

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
            depositAmount: depositAmount > 0 ? depositAmount : null,
            comment: comment || null,
            clientId: client.id,
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
