export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { getClient } from '@/actions/clients';
import { ClientDetail } from './ClientDetail';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getClient(id);
  if ('error' in result) notFound();

  const { client } = result;
  return (
    <AdminShell>
      <ClientDetail client={client} />
    </AdminShell>
  );
}
