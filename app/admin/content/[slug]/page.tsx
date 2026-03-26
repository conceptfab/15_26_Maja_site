export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/actions/content';
import { AdminShell } from '@/components/admin/AdminShell';
import { SectionEditor } from './SectionEditor';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ContentEditPage({ params }: Props) {
  const { slug } = await params;
  const section = await getContentBySlug(slug);

  if (!section) {
    notFound();
  }

  return (
    <AdminShell>
      <SectionEditor section={section} />
    </AdminShell>
  );
}
