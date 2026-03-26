import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      where: { page: { isHome: true } },
      orderBy: { order: 'asc' },
      select: { slug: true, titlePl: true },
    });

    return NextResponse.json(sections);
  } catch {
    return NextResponse.json([]);
  }
}
