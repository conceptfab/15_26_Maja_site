'use server';

import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize';

export async function getContent() {
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
  const session = await verifySession();
  if (!session) return unauthorized();

  const section = await prisma.section.findFirst({
    where: { slug, page: { isHome: true } },
  });

  if (!section) {
    return { error: 'Sekcja nie znaleziona' };
  }

  const updateData: Record<string, unknown> = {};
  if (data.titlePl !== undefined) updateData.titlePl = data.titlePl;
  if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
  if (data.contentPl !== undefined) updateData.contentPl = sanitizeContentRecord(data.contentPl) as object;
  if (data.contentEn !== undefined) updateData.contentEn = sanitizeContentRecord(data.contentEn) as object;
  if (data.bgImage !== undefined) updateData.bgImage = data.bgImage;
  if (data.bgColor !== undefined) updateData.bgColor = data.bgColor;
  if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;

  const updated = await prisma.section.update({
    where: { id: section.id },
    data: updateData,
  });

  return { success: true, section: updated };
}
