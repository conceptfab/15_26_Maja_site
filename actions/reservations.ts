'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { sendEmail, buildStatusChangeEmail } from '@/lib/mail';
import type { ReservationStatus } from '@/lib/validations';

function unauthorized() {
  return { error: 'Brak autoryzacji' };
}

type ReservationFilters = {
  status?: ReservationStatus;
  search?: string;
  page?: number;
  perPage?: number;
};

export async function getReservations(filters: ReservationFilters = {}) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const { status, search, page = 1, perPage = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { guestName: { contains: search } },
      { guestEmail: { contains: search } },
      { guestPhone: { contains: search } },
    ];
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

  let updated;
  try {
    updated = await prisma.reservation.update({
      where: { id },
      data: {
        status,
        isPaid: status === 'PAID' || status === 'COMPLETED',
      },
    });
  } catch {
    return { error: 'Rezerwacja nie znaleziona' };
  }

  // Email do gościa o zmianie statusu
  buildStatusChangeEmail(updated.guestName, status).then((emailContent) => {
    if (emailContent) {
      sendEmail({ to: updated.guestEmail, ...emailContent }).catch(() => {});
    }
  }).catch(() => {});

  return { success: true, reservation: updated };
}

export async function addAdminNote(id: string, note: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

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

export async function addBlockedDate(date: string, reason?: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { error: 'Nieprawidłowy format daty' };
  }

  const blocked = await prisma.blockedDate.create({
    data: {
      date: parsed,
      reason: reason || null,
    },
  });

  return { success: true, blocked };
}

export async function removeBlockedDate(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  await prisma.blockedDate.delete({ where: { id } });
  return { success: true };
}
