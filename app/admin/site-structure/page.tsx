import { getPageTree, getSectionsForGraph, createPage, updatePage, deletePage, reorderPages } from '@/actions/pages';
import { AdminShell } from '@/components/admin/AdminShell';
import { SiteStructureClient } from './client';

export const dynamic = 'force-dynamic';

export default async function SiteStructurePage() {
  const [pagesResult, sectionsResult] = await Promise.all([getPageTree(), getSectionsForGraph()]);

  if ('error' in pagesResult || 'error' in sectionsResult) {
    return (
      <AdminShell>
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Brak autoryzacji — <a href="/admin/login" className="underline">zaloguj się</a>.
        </div>
      </AdminShell>
    );
  }

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
          initialPages={pagesResult}
          initialSections={sectionsResult}
          createPage={createPage}
          updatePage={updatePage}
          deletePage={deletePage}
          reorderPages={reorderPages}
        />
      </div>
    </AdminShell>
  );
}
