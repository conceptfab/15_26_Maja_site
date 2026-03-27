'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
  applyNodeChanges,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PageNode, SectionNode } from '@/actions/pages';

// --- Ikony sekcji ---
const SECTION_ICONS: Record<string, string> = {
  hero: '🏠',
  koncept: '💡',
  miejsce: '🌿',
  rezerwacja: '📅',
  kontakt: '📬',
};

// --- Menu items (sekcje widoczne w nawigacji) ---
const MENU_SLUGS = ['koncept', 'miejsce', 'rezerwacja'];

// --- Typy ---

type PageFormData = {
  id?: string;
  title: string;
  slug: string;
  isVisible: boolean;
  parentId: string | null;
};

type Props = {
  pages: PageNode[];
  sections: SectionNode[];
  onCreatePage: (data: { title: string; slug: string; parentId: string | null; isVisible: boolean }) => Promise<{ error?: string }>;
  onUpdatePage: (id: string, data: Partial<PageFormData>) => Promise<{ error?: string }>;
  onDeletePage: (id: string) => Promise<{ error?: string }>;
  onReorder: (updates: { id: string; order: number; parentId: string | null }[]) => Promise<{ error?: string }>;
};

// --- Helpers ---

function flattenPages(pages: PageNode[]): PageNode[] {
  const result: PageNode[] = [];
  function walk(nodes: PageNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(pages);
  return result;
}

function buildNodesAndEdges(pages: PageNode[], sections: SectionNode[]) {
  const flat = flattenPages(pages);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const PAGE_W = 160;
  const SEC_W = 130;
  const SEC_X_GAP = 145;
  const SEC_Y = 80;

  // Grupuj sekcje po pageId
  const sectionsByPage = new Map<string, SectionNode[]>();
  for (const s of sections) {
    if (!sectionsByPage.has(s.pageId)) sectionsByPage.set(s.pageId, []);
    sectionsByPage.get(s.pageId)!.push(s);
  }

  // Poziomy stron
  const levels = new Map<number, PageNode[]>();
  function assignLevel(items: PageNode[], level: number) {
    if (!levels.has(level)) levels.set(level, []);
    for (const item of items) {
      levels.get(level)!.push(item);
      if (item.children.length > 0) assignLevel(item.children, level + 1);
    }
  }
  assignLevel(pages, 0);

  levels.forEach((items, level) => {
    items.forEach((page, i) => {
      // Centruj stronę nad jej sekcjami
      const pageSections = sectionsByPage.get(page.id) ?? [];
      const secCount = Math.max(pageSections.length, 1);
      const secRowWidth = secCount * SEC_X_GAP;
      const pageX = i * (secRowWidth + 40) + secRowWidth / 2 - PAGE_W / 2;
      const pageY = level * 220;

      const color = page.isHome ? '#3b82f6' : page.isVisible ? '#22c55e' : '#9ca3af';

      nodes.push({
        id: page.id,
        position: { x: pageX, y: pageY },
        data: { label: page.title, page },
        style: {
          width: PAGE_W,
          border: `2px solid ${color}`,
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          color: '#1a1a1a',
          background: '#ffffff',
          textAlign: 'center' as const,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      });

      // Sekcje pod stroną
      const secStartX = i * (secRowWidth + 40);

      pageSections.forEach((sec, si) => {
        const secId = `sec-${sec.id}`;
        const isInMenu = MENU_SLUGS.includes(sec.slug);
        const icon = SECTION_ICONS[sec.slug] ?? '📄';
        const secColor = sec.isVisible ? (isInMenu ? '#8b5cf6' : '#22c55e') : '#9ca3af';

        nodes.push({
          id: secId,
          position: { x: secStartX + si * SEC_X_GAP + (SEC_X_GAP - SEC_W) / 2, y: pageY + SEC_Y },
          data: { label: `${icon} ${sec.titlePl || sec.slug}`, section: sec },
          draggable: false,
          connectable: false,
          style: {
            width: SEC_W,
            border: `1.5px solid ${secColor}`,
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: '#333333',
            background: sec.isVisible ? '#fafafa' : '#f0f0f0',
            textAlign: 'center' as const,
            opacity: sec.isVisible ? 1 : 0.6,
          },
        });

        edges.push({
          id: `e-page-sec-${sec.id}`,
          source: page.id,
          target: secId,
          type: 'smoothstep',
          style: { stroke: secColor, strokeWidth: 1.5, strokeDasharray: isInMenu ? undefined : '4 4' },
          animated: isInMenu,
        });
      });
    });
  });

  // Strona → strona krawędzie
  for (const page of flat) {
    if (page.parentId) {
      edges.push({
        id: `e-${page.parentId}-${page.id}`,
        source: page.parentId,
        target: page.id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges };
}

// --- Panel boczny ---

function SidePanel({
  page,
  section,
  onSave,
  onDelete,
  onClose,
}: {
  page?: PageNode;
  section?: SectionNode;
  onSave: (id: string, data: Partial<PageFormData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  if (section) {
    return (
      <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-border shadow-lg p-4 z-50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Sekcja</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>
        <div className="text-2xl text-center py-2">{SECTION_ICONS[section.slug] ?? '📄'}</div>
        <p className="text-sm font-medium">{section.titlePl || section.slug}</p>
        <p className="text-xs text-muted-foreground">Slug: /{section.slug}</p>
        <p className="text-xs text-muted-foreground">Kolejność: {section.order}</p>
        <p className="text-xs">
          {section.isVisible
            ? <span className="text-green-600">Widoczna</span>
            : <span className="text-gray-400">Ukryta</span>}
        </p>
        {MENU_SLUGS.includes(section.slug) && (
          <p className="text-xs text-purple-600 font-medium">W menu nawigacyjnym</p>
        )}
        <div className="mt-auto">
          <a
            href={`/admin/content/${section.slug}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Edytuj treść sekcji &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (!page) return null;

  return <PageSidePanel page={page} onSave={onSave} onDelete={onDelete} onClose={onClose} />;
}

function PageSidePanel({
  page,
  onSave,
  onDelete,
  onClose,
}: {
  page: PageNode;
  onSave: (id: string, data: Partial<PageFormData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isVisible, setIsVisible] = useState(page.isVisible);
  const [saving, setSaving] = useState(false);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-border shadow-lg p-4 z-50 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Edycja strony</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
      </div>

      <label className="text-xs text-muted-foreground">
        Tytuł
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </label>

      <label className="text-xs text-muted-foreground">
        Slug
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" />
      </label>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
        Widoczna
      </label>

      <p className="text-xs text-muted-foreground">
        Sekcji: {page._count.sections}
      </p>

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(page.id, { title, slug, isVisible });
            setSaving(false);
          }}
        >
          {saving ? 'Zapisuję...' : 'Zapisz'}
        </Button>
        {!page.isHome && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm('Na pewno usunąć tę stronę?')) {
                onDelete(page.id);
              }
            }}
          >
            Usuń
          </Button>
        )}
      </div>

      <a
        href={`/admin/content/${page.slug}`}
        className="text-xs text-blue-600 hover:underline mt-1"
      >
        Edytuj sekcje strony &rarr;
      </a>
    </div>
  );
}

// --- Dialog dodawania ---

function AddPageDialog({
  parentId,
  onAdd,
  onClose,
}: {
  parentId: string | null;
  onAdd: (data: { title: string; slug: string; parentId: string | null; isVisible: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white border border-border rounded-lg shadow-lg p-4 z-50 flex flex-col gap-3">
      <h3 className="font-semibold text-sm">Nowa podstrona</h3>

      <label className="text-xs text-muted-foreground">
        Tytuł
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
          }}
          className="mt-1"
          placeholder="np. Apartament A"
        />
      </label>

      <label className="text-xs text-muted-foreground">
        Slug
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" placeholder="np. apartament-a" />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={adding || !title || !slug}
          onClick={async () => {
            setAdding(true);
            setError('');
            await onAdd({ title, slug, parentId, isVisible: true });
            setAdding(false);
          }}
        >
          {adding ? 'Dodaję...' : 'Dodaj'}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

// --- Główny komponent ---

export function SiteStructureGraph({ pages, sections, onCreatePage, onUpdatePage, onDeletePage, onReorder }: Props) {
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionNode | null>(null);
  const [addDialog, setAddDialog] = useState<{ parentId: string | null } | null>(null);
  const [error, setError] = useState('');
  const [localPages, setLocalPages] = useState(pages);

  useEffect(() => {
    setLocalPages(pages);
  }, [pages]);

  const { nodes: initialNodes, edges } = useMemo(() => buildNodesAndEdges(localPages, sections), [localPages, sections]);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const flat = useMemo(() => flattenPages(localPages), [localPages]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Check if it's a section node
      if (node.id.startsWith('sec-')) {
        const sec = sections.find((s) => `sec-${s.id}` === node.id);
        if (sec) {
          setSelectedSection(sec);
          setSelectedPage(null);
          setAddDialog(null);
        }
        return;
      }
      const page = flat.find((p) => p.id === node.id);
      if (page) {
        setSelectedPage(page);
        setSelectedSection(null);
        setAddDialog(null);
      }
    },
    [flat, sections]
  );

  const handleSave = async (id: string, data: Partial<PageFormData>) => {
    setError('');
    const result = await onUpdatePage(id, data);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedPage(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    const result = await onDeletePage(id);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedPage(null);
    }
  };

  const handleAdd = async (data: { title: string; slug: string; parentId: string | null; isVisible: boolean }) => {
    setError('');
    const result = await onCreatePage(data);
    if (result.error) {
      setError(result.error);
    } else {
      setAddDialog(null);
    }
  };

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.target.startsWith('sec-')) return; // Can't reparent sections
      setError('');
      const result = await onUpdatePage(connection.target, { parentId: connection.source });
      if (result.error) setError(result.error);
    },
    [onUpdatePage]
  );

  return (
    <div className="relative w-full h-[600px] border border-border rounded-lg overflow-hidden" style={{ background: '#f8f9fa' }}>
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-md">
          {error}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />

        <Panel position="top-left">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAddDialog({ parentId: null });
              setSelectedPage(null);
              setSelectedSection(null);
            }}
          >
            + Dodaj stronę
          </Button>
        </Panel>

        <Panel position="top-right">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-white/80 px-2 py-1 rounded border">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Strona główna</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> W menu</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Widoczna</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Ukryta</span>
          </div>
        </Panel>
      </ReactFlow>

      {(selectedPage || selectedSection) && (
        <SidePanel
          page={selectedPage ?? undefined}
          section={selectedSection ?? undefined}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setSelectedPage(null); setSelectedSection(null); }}
        />
      )}

      {addDialog && (
        <AddPageDialog
          parentId={addDialog.parentId}
          onAdd={handleAdd}
          onClose={() => setAddDialog(null)}
        />
      )}
    </div>
  );
}
