import { getPageTree, getSectionsForGraph, createPage, updatePage, deletePage, reorderPages } from '@/actions/pages';
import { AdminShell } from '@/components/admin/AdminShell';
import { SiteStructureClient } from './client';

export const dynamic = 'force-dynamic';

export default async function SiteStructurePage() {
  const [pages, sections] = await Promise.all([getPageTree(), getSectionsForGraph()]);

  return (
    <AdminShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Struktura serwisu</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzaj drzewem stron. Kliknij węzeł, aby edytować. Przeciągnij, aby zmienić układ.
          </p>
          <div className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
            <strong>Funkcja eksperymentalna</strong> — ta sekcja jest w fazie rozwoju. Zalecamy nie wprowadzać tutaj zmian, aby uniknąć nieoczekiwanych problemów.
          </div>
        </div>

        <SiteStructureClient
          initialPages={pages}
          initialSections={sections}
          createPage={createPage}
          updatePage={updatePage}
          deletePage={deletePage}
          reorderPages={reorderPages}
        />
      </div>
    </AdminShell>
  );
}
