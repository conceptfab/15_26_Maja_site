export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { ClientsClient } from './ClientsClient';

export default function ClientsPage() {
  return (
    <AdminShell>
      <ClientsClient />
    </AdminShell>
  );
}
