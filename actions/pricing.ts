'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { z } from 'zod';

// --- Typy ---

export type PricingRule = {
  id: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  pricePerNight: number;
  isActive: boolean;
};

// --- Walidacja ---

const pricingRuleSchema = z.object({
  label: z.string().min(1, 'Nazwa jest wymagana').max(100),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  pricePerNight: z.number().min(0, 'Cena musi być >= 0'),
  isActive: z.boolean().optional().default(true),
}).refine((data) => data.dateTo >= data.dateFrom, {
  message: 'Data końcowa musi być >= data początkowa',
  path: ['dateTo'],
});

// --- Actions ---

export async function getPricingRules(): Promise<PricingRule[]> {
  const session = await verifySession();
  if (!session) return [];

  const rules = await prisma.pricingRule.findMany({
    orderBy: { dateFrom: 'asc' },
  });

  return rules.map((r) => ({
    id: r.id,
    label: r.label,
    dateFrom: r.dateFrom.toISOString().split('T')[0],
    dateTo: r.dateTo.toISOString().split('T')[0],
    pricePerNight: r.pricePerNight,
    isActive: r.isActive,
  }));
}

/** Pobiera aktywne reguły cenowe (dla calculatePrice — bez auth) */
export async function getActivePricingRules() {
  const rules = await prisma.pricingRule.findMany({
    where: { isActive: true },
    select: { dateFrom: true, dateTo: true, pricePerNight: true },
    orderBy: { dateFrom: 'asc' },
  });
  return rules;
}

export async function createPricingRule(data: {
  label: string;
  dateFrom: string;
  dateTo: string;
  pricePerNight: number;
}) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const parsed = pricingRuleSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rule = await prisma.pricingRule.create({
    data: {
      label: parsed.data.label,
      dateFrom: new Date(parsed.data.dateFrom),
      dateTo: new Date(parsed.data.dateTo),
      pricePerNight: parsed.data.pricePerNight,
      isActive: parsed.data.isActive,
    },
  });

  return { success: true, id: rule.id };
}

export async function updatePricingRule(
  id: string,
  data: {
    label?: string;
    dateFrom?: string;
    dateTo?: string;
    pricePerNight?: number;
    isActive?: boolean;
  },
) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) return { error: 'Reguła nie znaleziona' };

  const merged = {
    label: data.label ?? existing.label,
    dateFrom: data.dateFrom ?? existing.dateFrom.toISOString().split('T')[0],
    dateTo: data.dateTo ?? existing.dateTo.toISOString().split('T')[0],
    pricePerNight: data.pricePerNight ?? existing.pricePerNight,
    isActive: data.isActive ?? existing.isActive,
  };

  const parsed = pricingRuleSchema.safeParse(merged);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.pricingRule.update({
    where: { id },
    data: {
      label: parsed.data.label,
      dateFrom: new Date(parsed.data.dateFrom),
      dateTo: new Date(parsed.data.dateTo),
      pricePerNight: parsed.data.pricePerNight,
      isActive: parsed.data.isActive,
    },
  });

  return { success: true };
}

export async function deletePricingRule(id: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.pricingRule.delete({ where: { id } });
  return { success: true };
}
