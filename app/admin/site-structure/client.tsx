'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SiteStructureGraph } from '@/components/admin/SiteStructureGraph';
import type { PageNode, SectionNode } from '@/actions/pages';

type Props = {
  initialPages: PageNode[];
  initialSections: SectionNode[];
  createPage: (data: { title: string; slug: string; parentId: string | null; isVisible?: boolean }) => Promise<{ error?: string; success?: boolean }>;
  updatePage: (id: string, data: Record<string, unknown>) => Promise<{ error?: string; success?: boolean }>;
  deletePage: (id: string) => Promise<{ error?: string; success?: boolean }>;
  reorderPages: (updates: { id: string; order: number; parentId: string | null }[]) => Promise<{ error?: string; success?: boolean }>;
};

export function SiteStructureClient({ initialPages, initialSections, createPage, updatePage, deletePage, reorderPages }: Props) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCreate = useCallback(
    async (data: { title: string; slug: string; parentId: string | null; isVisible: boolean }) => {
      const result = await createPage(data);
      if (!result.error) refresh();
      return result;
    },
    [createPage, refresh]
  );

  const handleUpdate = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const result = await updatePage(id, data);
      if (!result.error) refresh();
      return result;
    },
    [updatePage, refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deletePage(id);
      if (!result.error) refresh();
      return result;
    },
    [deletePage, refresh]
  );

  const handleReorder = useCallback(
    async (updates: { id: string; order: number; parentId: string | null }[]) => {
      const result = await reorderPages(updates);
      if (!result.error) refresh();
      return result;
    },
    [reorderPages, refresh]
  );

  return (
    <SiteStructureGraph
      pages={initialPages}
      sections={initialSections}
      onCreatePage={handleCreate}
      onUpdatePage={handleUpdate}
      onDeletePage={handleDelete}
      onReorder={handleReorder}
    />
  );
}
