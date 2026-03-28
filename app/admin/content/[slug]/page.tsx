export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/actions/content';
import { getImagesForSection } from '@/actions/gallery';
import { AdminShell } from '@/components/admin/AdminShell';
import { SectionEditor } from './SectionEditor';

type Props = {
  params: Promise<{ slug: string }>;
};

const GALLERY_SECTIONS = ['koncept', 'miejsce'];

export default async function ContentEditPage({ params }: Props) {
  const { slug } = await params;
  const section = await getContentBySlug(slug);

  if (!section) {
    notFound();
  }

  const galleryImages = GALLERY_SECTIONS.includes(slug)
    ? await getImagesForSection(section.id)
    : [];

  return (
    <AdminShell>
      <SectionEditor key={section.id} section={section} galleryImages={galleryImages} />
    </AdminShell>
  );
}
