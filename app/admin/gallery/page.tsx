export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { getGalleryImages } from '@/actions/gallery';
import { prisma } from '@/lib/db';
import { GalleryManager } from './GalleryManager';

async function getSections() {
  return prisma.section.findMany({
    where: { page: { isHome: true } },
    orderBy: { order: 'asc' },
    select: { id: true, slug: true, titlePl: true },
  });
}

export default async function GalleryPage() {
  const [imagesResult, sections] = await Promise.all([
    getGalleryImages(),
    getSections(),
  ]);

  if ('error' in imagesResult) return <AdminShell><p className="text-destructive">{imagesResult.error}</p></AdminShell>;

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Galeria</h1>
        <GalleryManager initialImages={imagesResult} sections={sections} />
      </div>
    </AdminShell>
  );
}
