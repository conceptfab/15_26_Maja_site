'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { z } from 'zod';

// --- Typy ---

export type PageNode = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  order: number;
  isVisible: boolean;
  isHome: boolean;
  _count: { sections: number };
  children: PageNode[];
};

// --- Walidacja ---

const createPageSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/, 'Slug: tylko małe litery, cyfry, myślniki, ukośniki'),
  parentId: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

// Slugi zarezerwowane (nie mogą być stronami)
const RESERVED_SLUGS = ['admin', 'api', '_next', 'uploads'];

// --- Helpers ---

function buildTree(pages: (PageNode & { children?: PageNode[] })[]): PageNode[] {
  const map = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// --- Actions ---

export async function getPageTree(): Promise<PageNode[] | { error: string }> {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const pages = await prisma.page.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { sections: true } } },
  });

  return buildTree(pages as unknown as PageNode[]);
}

export type SectionNode = {
  id: string;
  slug: string;
  titlePl: string | null;
  order: number;
  isVisible: boolean;
  pageId: string;
};

export async function getSectionsForGraph(): Promise<SectionNode[] | { error: string }> {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  return prisma.section.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, slug: true, titlePl: true, order: true, isVisible: true, pageId: true },
  });
}

export async function getPageFlat() {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  return prisma.page.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { sections: true } } },
  });
}

export async function createPage(data: z.infer<typeof createPageSchema>) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const parsed = createPageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, slug, parentId, isVisible } = parsed.data;

  // Sprawdź zarezerwowane slugi
  const firstSegment = slug.split('/')[0];
  if (RESERVED_SLUGS.includes(firstSegment)) {
    return { error: `Slug "${firstSegment}" jest zarezerwowany` };
  }

  // Sprawdź unikalność
  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) return { error: 'Strona o tym slugu już istnieje' };

  // Policz kolejność wśród rodzeństwa
  const siblingCount = await prisma.page.count({
    where: { parentId: parentId ?? null },
  });

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      parentId: parentId ?? null,
      order: siblingCount,
      isVisible: isVisible ?? true,
    },
  });

  return { success: true, page };
}

export async function updatePage(id: string, data: z.infer<typeof updatePageSchema>) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const parsed = updatePageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return { error: 'Strona nie znaleziona' };

  // Nie pozwalaj usunąć isHome na jedynej stronie głównej
  if (page.isHome && parsed.data.slug) {
    const firstSegment = parsed.data.slug.split('/')[0];
    if (RESERVED_SLUGS.includes(firstSegment)) {
      return { error: `Slug "${firstSegment}" jest zarezerwowany` };
    }
  }

  // Sprawdź unikalność sluga
  if (parsed.data.slug && parsed.data.slug !== page.slug) {
    const existing = await prisma.page.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return { error: 'Strona o tym slugu już istnieje' };
  }

  // Nie pozwalaj na circular parent
  if (parsed.data.parentId !== undefined) {
    if (parsed.data.parentId === id) {
      return { error: 'Strona nie może być swoim rodzicem' };
    }
    // Sprawdź czy nowy parent nie jest potomkiem tej strony
    if (parsed.data.parentId) {
      let current = parsed.data.parentId;
      const visited = new Set<string>();
      while (current) {
        if (visited.has(current)) break;
        visited.add(current);
        if (current === id) return { error: 'Circular reference — rodzic jest potomkiem' };
        const parent = await prisma.page.findUnique({ where: { id: current }, select: { parentId: true } });
        current = parent?.parentId ?? '';
      }
    }
  }

  const updated = await prisma.page.update({
    where: { id },
    data: parsed.data,
  });

  return { success: true, page: updated };
}

export async function deletePage(id: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const page = await prisma.page.findUnique({
    where: { id },
    include: { children: true, _count: { select: { sections: true } } },
  });

  if (!page) return { error: 'Strona nie znaleziona' };
  if (page.isHome) return { error: 'Nie można usunąć strony głównej' };

  // Przenieś dzieci do rodzica usuwanej strony
  if (page.children.length > 0) {
    await prisma.page.updateMany({
      where: { parentId: id },
      data: { parentId: page.parentId },
    });
  }

  // Kaskadowo usunie sekcje (onDelete: Cascade w schema)
  await prisma.page.delete({ where: { id } });

  return { success: true };
}

export async function reorderPages(updates: { id: string; order: number; parentId: string | null }[]) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  // Batch update w transakcji
  await prisma.$transaction(
    updates.map((u) =>
      prisma.page.update({
        where: { id: u.id },
        data: { order: u.order, parentId: u.parentId },
      })
    )
  );

  return { success: true };
}
