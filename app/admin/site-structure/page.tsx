import { getPageTree, createPage, updatePage, deletePage, reorderPages } from '@/actions/pages';
import { SiteStructureClient } from './client';

export default async function SiteStructurePage() {
  const pages = await getPageTree();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Struktura serwisu</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj drzewem stron. Kliknij węzeł, aby edytować. Przeciągnij, aby zmienić układ.
        </p>
      </div>

      <SiteStructureClient
        initialPages={pages}
        createPage={createPage}
        updatePage={updatePage}
        deletePage={deletePage}
        reorderPages={reorderPages}
      />
    </div>
  );
}
