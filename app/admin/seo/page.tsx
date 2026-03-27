export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/admin/AdminShell';
import { getGlobalSeo, getLlmsTxtContent } from '@/actions/seo';
import { SeoForm } from './SeoForm';

export default async function SeoPage() {
  const [globalSeo, llmsTxt] = await Promise.all([
    getGlobalSeo(),
    getLlmsTxtContent(),
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">SEO i widoczność</h1>
        <SeoForm initialData={globalSeo} initialLlmsTxt={llmsTxt} />
      </div>
    </AdminShell>
  );
}
