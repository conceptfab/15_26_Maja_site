'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { CONFIRMED_STATUSES } from '@/lib/reservation-status';

const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  tags: z.string().max(1000).optional(),
  adminNote: z.string().max(2000).optional(),
  discount: z.number().min(0).max(100).optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().max(500).optional(),
});

type ClientFilters = {
  search?: string;
  tag?: string;
  blacklisted?: boolean;
  page?: number;
  perPage?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'reservationCount' | 'totalSpent';
  sortDir?: 'asc' | 'desc';
};

export async function getClients(filters: ClientFilters = {}) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const { search, tag, blacklisted, page = 1, perPage = 20, sortBy = 'createdAt', sortDir = 'desc' } = filters;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (tag) {
    where.tags = { contains: tag };
  }
  if (blacklisted !== undefined) {
    where.isBlacklisted = blacklisted;
  }

  const orderBy: Record<string, string> = {};
  if (sortBy === 'name' || sortBy === 'email' || sortBy === 'createdAt') {
    orderBy[sortBy] = sortDir;
  }

  // Dla computed fields: pobierz WSZYSTKICH klientów (bez paginacji), sortuj, potem paginuj
  const needsComputedSort = sortBy === 'reservationCount' || sortBy === 'totalSpent';

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: !needsComputedSort && Object.keys(orderBy).length > 0 ? orderBy : { createdAt: 'desc' },
      ...(needsComputedSort ? {} : { skip: (page - 1) * perPage, take: perPage }),
      include: {
        reservations: {
          select: { id: true, totalPrice: true, status: true, checkOut: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  const clientsWithStats = clients.map((c) => {
    const confirmed = c.reservations.filter((r) =>
      (CONFIRMED_STATUSES as readonly string[]).includes(r.status)
    );
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      locale: c.locale,
      rating: c.rating,
      tags: c.tags,
      adminNote: c.adminNote,
      discount: c.discount,
      isBlacklisted: c.isBlacklisted,
      createdAt: c.createdAt.toISOString(),
      reservationCount: c.reservations.length,
      totalSpent: confirmed.reduce((s, r) => s + r.totalPrice, 0),
      lastStay: c.reservations.length > 0
        ? c.reservations.sort((a, b) => b.checkOut.getTime() - a.checkOut.getTime())[0].checkOut.toISOString()
        : null,
    };
  });

  // Sort by computed fields and paginate manually
  if (needsComputedSort) {
    clientsWithStats.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    const start = (page - 1) * perPage;
    return {
      clients: clientsWithStats.slice(start, start + perPage),
      total,
      pages: Math.ceil(total / perPage),
    };
  }

  return {
    clients: clientsWithStats,
    total,
    pages: Math.ceil(total / perPage),
  };
}

export async function getClient(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      reservations: {
        orderBy: { checkIn: 'desc' },
        select: {
          id: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          guests: true,
          totalPrice: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!client) return { error: 'Klient nie znaleziony' };
  return { client };
}

export async function updateClient(id: string, data: {
  name?: string;
  phone?: string;
  rating?: number | null;
  tags?: string;
  adminNote?: string;
  discount?: number;
  isBlacklisted?: boolean;
  blacklistReason?: string;
}) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane' };
  }

  await prisma.client.update({
    where: { id },
    data: parsed.data,
  });

  return { success: true };
}
