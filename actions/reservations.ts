'use server';

import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import {
  sendEmail,
  buildStatusChangeEmail,
  buildGuestConfirmationEmail,
  loadEmailContext,
  type ReservationEmailData,
} from '@/lib/mail';
import { format, differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';
import { extractZodError, type ReservationStatus } from '@/lib/validations';
import { DELETABLE_STATUSES } from '@/lib/reservation-status';

const updateReservationSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.number().int().min(1).max(20).optional(),
  totalPrice: z.number().finite().min(0).optional(),
});

type SortableColumn = 'checkIn' | 'checkOut' | 'totalPrice' | 'createdAt' | 'guests' | 'nights';

type ReservationFilters = {
  status?: ReservationStatus;
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: SortableColumn;
  sortDir?: 'asc' | 'desc';
};

const SORTABLE_COLUMNS: SortableColumn[] = ['checkIn', 'checkOut', 'totalPrice', 'createdAt', 'guests', 'nights'];

export async function getReservations(filters: ReservationFilters = {}) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const { status, search, page = 1, perPage = 20, sortBy = 'createdAt', sortDir = 'desc' } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestEmail: { contains: search, mode: 'insensitive' } },
      { guestPhone: { contains: search } },
    ];
  }

  const orderByColumn = SORTABLE_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
  const orderByDir = sortDir === 'asc' ? 'asc' : 'desc';

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        checkIn: true,
        checkOut: true,
        status: true,
        totalPrice: true,
        nights: true,
        guests: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { [orderByColumn]: orderByDir },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.reservation.count({ where }),
  ]);

  return {
    reservations: reservations.map((r) => ({
      ...r,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / perPage),
  };
}

export async function getReservation(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return { error: 'Rezerwacja nie znaleziona' };

  return {
    reservation: {
      ...reservation,
      checkIn: reservation.checkIn.toISOString(),
      checkOut: reservation.checkOut.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    },
  };
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  const session = await verifySession();
  if (!session) return unauthorized();

  // Pobierz aktualny status przed zmianą
  const current = await prisma.reservation.findUnique({ where: { id }, select: { status: true } });
  if (!current) return { error: 'Rezerwacja nie znaleziona' };

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.update({
        where: { id },
        data: {
          status,
          isPaid: status === 'PAID' || status === 'COMPLETED',
          depositPaidAt: status === 'DEPOSIT_PAID' ? new Date() : undefined,
        },
      });

      // Zapisz historię zmiany statusu
      await tx.statusHistory.create({
        data: {
          reservationId: id,
          oldStatus: current.status,
          newStatus: status,
          changedBy: session.admin.email ?? null,
        },
      });

      return res;
    });
  } catch {
    return { error: 'Nie udało się zaktualizować statusu' };
  }

  // Email do gościa o zmianie statusu
  buildStatusChangeEmail(updated.guestName, status).then((emailContent) => {
    if (emailContent) {
      sendEmail({ to: updated.guestEmail, ...emailContent }).catch((err) => {
        console.error('[reservations] Błąd wysyłki emaila statusu:', err);
      });
    }
  }).catch((err) => {
    console.error('[reservations] Błąd budowania emaila statusu:', err);
  });

  return { success: true, reservation: updated };
}

export async function updateReservation(
  id: string,
  data: { checkIn?: string; checkOut?: string; guests?: number; totalPrice?: number }
) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = updateReservationSchema.safeParse(data);
  if (!parsed.success) return { error: extractZodError(parsed.error) };

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return { error: 'Rezerwacja nie znaleziona' };

  const checkIn = parsed.data.checkIn ? new Date(parsed.data.checkIn) : reservation.checkIn;
  const checkOut = parsed.data.checkOut ? new Date(parsed.data.checkOut) : reservation.checkOut;

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { error: 'Nieprawidłowy format daty' };
  }

  if (checkOut <= checkIn) return { error: 'Data wymeldowania musi być po zameldowaniu' };

  const nights = differenceInCalendarDays(checkOut, checkIn);
  const guests = parsed.data.guests ?? reservation.guests;
  const totalPrice = parsed.data.totalPrice ?? reservation.totalPrice;

  // Sprawdź kolizje z innymi rezerwacjami (poza bieżącą)
  const overlap = await prisma.reservation.findFirst({
    where: {
      id: { not: id },
      status: { notIn: ['CANCELLED'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });

  if (overlap) return { error: 'Daty nakładają się z inną rezerwacją' };

  const updated = await prisma.reservation.update({
    where: { id },
    data: { checkIn, checkOut, nights, guests, totalPrice },
  });

  return { success: true, reservation: updated };
}

export async function getStatusHistory(reservationId: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const history = await prisma.statusHistory.findMany({
    where: { reservationId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    history: history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export async function addAdminNote(id: string, note: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  if (note.length > 2000) {
    return { error: 'Notatka nie może przekraczać 2000 znaków' };
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { adminNote: note },
  });

  return { success: true, reservation: updated };
}

// --- Blocked Dates ---

export async function getBlockedDates() {
  const session = await verifySession();
  if (!session) return unauthorized();

  const dates = await prisma.blockedDate.findMany({
    orderBy: { date: 'asc' },
  });

  return {
    dates: dates.map((d) => ({
      ...d,
      date: d.date.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

const BLOCKED_DATE_TYPES = ['BLOCKED', 'SERVICE'] as const;

export async function addBlockedDate(date: string, reason?: string, type: 'BLOCKED' | 'SERVICE' = 'BLOCKED') {
  const session = await verifySession();
  if (!session) return unauthorized();

  if (!BLOCKED_DATE_TYPES.includes(type)) {
    return { error: 'Nieprawidłowy typ blokady' };
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { error: 'Nieprawidłowy format daty' };
  }

  // Sprawdź duplikat
  const existing = await prisma.blockedDate.findFirst({
    where: { date: parsed },
  });
  if (existing) return { error: 'Ta data jest już zablokowana' };

  const blocked = await prisma.blockedDate.create({
    data: {
      date: parsed,
      reason: reason?.slice(0, 200) || null,
      type,
    },
  });

  return { success: true, blocked };
}

export async function removeBlockedDate(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  try {
    await prisma.blockedDate.delete({ where: { id } });
  } catch {
    return { error: 'Nie znaleziono wpisu do usunięcia' };
  }
  return { success: true };
}

export type EmailTemplateType = 'confirmation' | 'deposit' | 'cancellation' | 'postStay';

export async function sendGuestEmail(reservationId: string, templateType: EmailTemplateType) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!reservation) return { error: 'Rezerwacja nie znaleziona' };

  try {
    if (templateType === 'confirmation') {
      const emailData: ReservationEmailData = {
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone || '',
        checkIn: format(reservation.checkIn, 'dd.MM.yyyy'),
        checkOut: format(reservation.checkOut, 'dd.MM.yyyy'),
        nights: reservation.nights,
        guests: reservation.guests,
        totalPrice: reservation.totalPrice,
        comment: reservation.comment || undefined,
      };
      const ctx = await loadEmailContext();
      const email = await buildGuestConfirmationEmail(emailData, ctx);
      const result = await sendEmail({ to: reservation.guestEmail, ...email });
      if (!result.success) return { error: `Nie udało się wysłać: ${result.reason}` };
    } else {
      // deposit / cancellation / postStay → use status change templates
      const statusMap: Record<string, string> = {
        deposit: 'DEPOSIT_PAID',
        cancellation: 'CANCELLED',
        postStay: 'COMPLETED',
      };
      const status = statusMap[templateType];
      const email = await buildStatusChangeEmail(reservation.guestName, status);
      if (!email) return { error: 'Brak szablonu dla tego typu' };
      const result = await sendEmail({ to: reservation.guestEmail, ...email });
      if (!result.success) return { error: `Nie udało się wysłać: ${result.reason}` };
    }

    return { success: true };
  } catch {
    return { error: 'Wystąpił błąd przy wysyłaniu emaila' };
  }
}

export async function deleteReservation(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!reservation) return { error: 'Rezerwacja nie znaleziona' };

  if (!DELETABLE_STATUSES.includes(reservation.status)) {
    return { error: 'Nie można usunąć rezerwacji o tym statusie' };
  }

  await prisma.reservation.delete({ where: { id } });
  return { success: true };
}
