export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { getContentBySlug } from '@/actions/content';
import { getImagesForSection } from '@/actions/gallery';
import { prisma } from '@/lib/db';
import { MiejscaEditor } from './MiejscaEditor';

async function getMiejsceSection() {
  return prisma.section.findFirst({
    where: { slug: 'miejsce', page: { isHome: true } },
    select: { id: true, slug: true, contentPl: true, contentEn: true, isVisible: true, titlePl: true, titleEn: true },
  });
}

export default async function MiejscaPage() {
  const section = await getMiejsceSection();
  if (!section) return <AdminShell><p>Brak sekcji</p></AdminShell>;

  const galleryImages = await getImagesForSection(section.id);

  return (
    <AdminShell>
      <MiejscaEditor section={section} galleryImages={galleryImages} />
    </AdminShell>
  );
}
