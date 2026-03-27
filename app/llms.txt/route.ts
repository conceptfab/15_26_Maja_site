import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'llmsTxt' },
  });

  const content = (setting?.value as { content: string } | null)?.content
    || `# HOMMM — Domek na wyłączność

## Lokalizacja
Polska

## Typ obiektu
Domek na wyłączność (całoroczny)

## Oferta
- Prywatny domek w sercu natury
- Cisza, prywatność, wypoczynek
- Idealne na romantyczny wyjazd lub odcięcie się od codzienności

## Kontakt
Strona: https://hommm.pl
Rezerwacja: https://hommm.pl/#rezerwacja
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
