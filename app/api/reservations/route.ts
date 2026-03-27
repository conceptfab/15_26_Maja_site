import { NextResponse } from 'next/server';
import { differenceInCalendarDays, format } from 'date-fns';
import { prisma } from '@/lib/db';
import { reservationSchema } from '@/lib/validations';
import {
  sendEmail,
  buildGuestConfirmationEmail,
  buildAdminNotificationEmail,
} from '@/lib/mail';

const PRICE_PER_NIGHT = 204.5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, comment } = parsed.data;

    // Sprawdź dostępność — czy nie ma nakładających się rezerwacji
    const overlapping = await prisma.reservation.findFirst({
      where: {
        status: { notIn: ['CANCELLED'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Wybrany termin jest niedostępny' },
        { status: 409 },
      );
    }

    // Sprawdź zablokowane daty
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        date: { gte: checkIn, lt: checkOut },
      },
    });

    if (blockedDate) {
      return NextResponse.json(
        { error: 'Wybrany termin jest zablokowany' },
        { status: 409 },
      );
    }

    const nights = differenceInCalendarDays(checkOut, checkIn);
    const totalPrice = Math.round(nights * PRICE_PER_NIGHT);

    const reservation = await prisma.reservation.create({
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

    // Emaile — fire & forget, nie blokujemy odpowiedzi
    const emailData = {
      guestName,
      guestEmail,
      guestPhone,
      checkIn: format(checkIn, 'dd.MM.yyyy'),
      checkOut: format(checkOut, 'dd.MM.yyyy'),
      nights,
      guests,
      totalPrice,
      comment,
    };

    const guestEmail_ = buildGuestConfirmationEmail(emailData);
    const adminEmail_ = buildAdminNotificationEmail(emailData);
    const adminAddress = process.env.ADMIN_EMAIL || 'admin@hommm.eu';

    Promise.allSettled([
      sendEmail({ to: guestEmail, ...guestEmail_ }),
      sendEmail({ to: adminAddress, ...adminEmail_ }),
    ]).catch(() => {});

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
