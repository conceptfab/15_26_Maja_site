import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize';
import { z } from 'zod';

const updateContentSchema = z.object({
  titlePl: z.string().max(200).nullable().optional(),
  titleEn: z.string().max(200).nullable().optional(),
  contentPl: z.record(z.string()).optional(),
  contentEn: z.record(z.string()).optional(),
  bgImage: z.string().max(500).refine((v) => !v || v.startsWith('https://') || v.startsWith('/'), 'URL musi zaczynać się od https:// lub /').nullable().optional(),
  bgColor: z.string().max(20).refine((v) => !v || /^#[0-9a-fA-F]{3,8}$/.test(v), 'Nieprawidłowy format koloru hex').nullable().optional(),
  isVisible: z.boolean().optional(),
});

export async function getContent() {
  'use server';
  const session = await verifySession();
  if (!session) return unauthorized();

  const sections = await prisma.section.findMany({
    where: { page: { isHome: true } },
    orderBy: { order: 'asc' },
    include: { page: { select: { slug: true } } },
  });

  return sections;
}

export async function getContentBySlug(slug: string) {
  const section = await prisma.section.findFirst({
    where: { slug, page: { isHome: true }, isVisible: true },
    include: { page: { select: { slug: true } } },
  });

  return section;
}

export type UpdateContentData = {
  titlePl?: string | null;
  titleEn?: string | null;
  contentPl?: Record<string, string>;
  contentEn?: Record<string, string>;
  bgImage?: string | null;
  bgColor?: string | null;
  isVisible?: boolean;
};

// Pola, które zawierają HTML (multiline w edytorze WYSIWYG)
const HTML_FIELDS = new Set([
  'body', 'intro',
  'description', 'description2', 'info',
]);

function sanitizeContentRecord(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = HTML_FIELDS.has(key) ? sanitizeHtml(value) : value;
  }
  return result;
}

export async function updateContent(slug: string, data: UpdateContentData) {
  'use server';
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = updateContentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const section = await prisma.section.findFirst({
    where: { slug, page: { isHome: true } },
  });

  if (!section) {
    return { error: 'Sekcja nie znaleziona' };
  }

  const safe = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (safe.titlePl !== undefined) updateData.titlePl = safe.titlePl;
  if (safe.titleEn !== undefined) updateData.titleEn = safe.titleEn;
  if (safe.contentPl !== undefined) updateData.contentPl = sanitizeContentRecord(safe.contentPl) as object;
  if (safe.contentEn !== undefined) updateData.contentEn = sanitizeContentRecord(safe.contentEn) as object;
  if (safe.bgImage !== undefined) updateData.bgImage = safe.bgImage;
  if (safe.bgColor !== undefined) updateData.bgColor = safe.bgColor;
  if (safe.isVisible !== undefined) updateData.isVisible = safe.isVisible;

  const updated = await prisma.section.update({
    where: { id: section.id },
    data: updateData,
  });

  return { success: true, section: updated };
}
