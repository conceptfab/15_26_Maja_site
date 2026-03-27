'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { z } from 'zod';

// --- Typy ---

export type SiteSettingsMap = {
  pricePerNight: number;
  maxGuests: number;
  contactEmail: string;
  contactPhone: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTiktok: string;
  companyName: string;
  companyAddress: string;
  companyNip: string;
};

const DEFAULTS: SiteSettingsMap = {
  pricePerNight: 204.5,
  maxGuests: 6,
  contactEmail: 'hommm@hommm.eu',
  contactPhone: '+48 608 259 945',
  socialInstagram: '',
  socialFacebook: '',
  socialTiktok: '',
  companyName: 'Banana Gun Design Maria Budner',
  companyAddress: 'ul. Sanocka 39 m 5, 93-038 Łódź',
  companyNip: '7292494164',
};

// --- Walidacja ---

const settingsSchema = z.object({
  pricePerNight: z.number().min(0, 'Cena musi być >= 0'),
  maxGuests: z.number().int().min(1).max(50),
  contactEmail: z.string().email('Nieprawidłowy email'),
  contactPhone: z.string().min(1, 'Telefon jest wymagany'),
  socialInstagram: z.string().max(500).optional().default(''),
  socialFacebook: z.string().max(500).optional().default(''),
  socialTiktok: z.string().max(500).optional().default(''),
  companyName: z.string().max(200).optional().default(''),
  companyAddress: z.string().max(500).optional().default(''),
  companyNip: z.string().max(20).optional().default(''),
});

// --- Actions ---

export async function getSettings(): Promise<SiteSettingsMap> {
  const rows = await prisma.siteSettings.findMany();
  const map: Record<string, unknown> = {};

  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    pricePerNight: typeof map.pricePerNight === 'number' ? map.pricePerNight : DEFAULTS.pricePerNight,
    maxGuests: typeof map.maxGuests === 'number' ? map.maxGuests : DEFAULTS.maxGuests,
    contactEmail: typeof map.contactEmail === 'string' ? map.contactEmail : DEFAULTS.contactEmail,
    contactPhone: typeof map.contactPhone === 'string' ? map.contactPhone : DEFAULTS.contactPhone,
    socialInstagram: typeof map.socialInstagram === 'string' ? map.socialInstagram : DEFAULTS.socialInstagram,
    socialFacebook: typeof map.socialFacebook === 'string' ? map.socialFacebook : DEFAULTS.socialFacebook,
    socialTiktok: typeof map.socialTiktok === 'string' ? map.socialTiktok : DEFAULTS.socialTiktok,
    companyName: typeof map.companyName === 'string' ? map.companyName : DEFAULTS.companyName,
    companyAddress: typeof map.companyAddress === 'string' ? map.companyAddress : DEFAULTS.companyAddress,
    companyNip: typeof map.companyNip === 'string' ? map.companyNip : DEFAULTS.companyNip,
  };
}

export async function updateSettings(data: Partial<SiteSettingsMap>) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  // Pobierz aktualne i scal
  const current = await getSettings();
  const merged = { ...current, ...data };

  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Upsert każdy klucz
  const entries = Object.entries(parsed.data) as [string, unknown][];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value: value as object },
        create: { key, value: value as object },
      })
    )
  );

  return { success: true };
}

// --- Admin whitelist ---

export async function getAdminWhitelist() {
  const session = await verifySession();
  if (!session) return [];

  return prisma.admin.findMany({
    select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addAdmin(email: string, name?: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const emailSchema = z.string().email();
  if (!emailSchema.safeParse(email).success) return { error: 'Nieprawidłowy email' };

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return { error: 'Admin o tym emailu już istnieje' };

  const admin = await prisma.admin.create({
    data: { email, name: name || null },
  });

  return { success: true, admin };
}

export async function removeAdmin(id: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  // Nie pozwól usunąć samego siebie
  if (session.admin.id === id) return { error: 'Nie można usunąć samego siebie' };

  // Nie pozwól usunąć ostatniego admina
  const count = await prisma.admin.count({ where: { isActive: true } });
  if (count <= 1) return { error: 'Musi być przynajmniej jeden admin' };

  await prisma.admin.delete({ where: { id } });
  return { success: true };
}
