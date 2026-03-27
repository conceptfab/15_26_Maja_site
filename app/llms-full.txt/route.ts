import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  // Pobierz wszystkie widoczne sekcje ze wszystkich stron
  const sections = await prisma.section.findMany({
    where: { isVisible: true, page: { isVisible: true } },
    orderBy: [{ page: { order: 'asc' } }, { order: 'asc' }],
    include: { page: { select: { title: true, slug: true } } },
  });

  let content = `# HOMMM — Pełny opis obiektu\n\n`;
  content += `Wygenerowano: ${new Date().toISOString().split('T')[0]}\n\n`;

  let currentPage = '';

  for (const section of sections) {
    if (section.page.title !== currentPage) {
      currentPage = section.page.title;
      content += `---\n\n## ${currentPage}\n\n`;
    }

    if (section.titlePl) {
      content += `### ${section.titlePl}\n\n`;
    }

    // Wyciągnij tekst z JSON content
    const textPl = extractText(section.contentPl);
    if (textPl) {
      content += `${textPl}\n\n`;
    }

    if (section.titleEn) {
      content += `### ${section.titleEn} (EN)\n\n`;
    }

    const textEn = extractText(section.contentEn);
    if (textEn) {
      content += `${textEn}\n\n`;
    }
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function extractText(json: unknown): string {
  if (typeof json === 'string') return json;
  if (!json || typeof json !== 'object') return '';

  const obj = json as Record<string, unknown>;
  const parts: string[] = [];

  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.trim()) {
      parts.push(value.trim());
    } else if (typeof value === 'object' && value) {
      const nested = extractText(value);
      if (nested) parts.push(nested);
    }
  }

  return parts.join('\n');
}
