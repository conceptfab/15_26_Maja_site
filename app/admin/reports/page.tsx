export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { ReportsClient } from './ReportsClient';

export default function ReportsPage() {
  return (
    <AdminShell>
      <ReportsClient />
    </AdminShell>
  );
}
