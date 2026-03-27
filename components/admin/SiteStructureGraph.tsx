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
import type { PageNode } from '@/actions/pages';

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
  onCreatePage: (data: { title: string; slug: string; parentId: string | null; isVisible: boolean }) => Promise<{ error?: string }>;
  onUpdatePage: (id: string, data: Partial<PageFormData>) => Promise<{ error?: string }>;
  onDeletePage: (id: string) => Promise<{ error?: string }>;
  onReorder: (updates: { id: string; order: number; parentId: string | null }[]) => Promise<{ error?: string }>;
};

// --- Helpers ---

const STATUS_COLORS: Record<string, string> = {
  home: '#3b82f6',     // blue
  visible: '#22c55e',  // green
  hidden: '#9ca3af',   // gray
};

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

function buildNodesAndEdges(pages: PageNode[]) {
  const flat = flattenPages(pages);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Proste auto-layout: hierarchia poziomami
  const levels = new Map<number, PageNode[]>();

  function assignLevel(items: PageNode[], level: number) {
    if (!levels.has(level)) levels.set(level, []);
    for (const item of items) {
      levels.get(level)!.push(item);
      if (item.children.length > 0) assignLevel(item.children, level + 1);
    }
  }
  assignLevel(pages, 0);

  const Y_GAP = 120;
  const X_GAP = 220;

  levels.forEach((items, level) => {
    const totalWidth = items.length * X_GAP;
    const startX = -totalWidth / 2 + X_GAP / 2;

    items.forEach((page, i) => {
      const color = page.isHome ? STATUS_COLORS.home : page.isVisible ? STATUS_COLORS.visible : STATUS_COLORS.hidden;

      nodes.push({
        id: page.id,
        position: { x: startX + i * X_GAP, y: level * Y_GAP },
        data: {
          label: `${page.title}\n/${page.slug}`,
          page,
        },
        style: {
          border: `2px solid ${color}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          background: '#ffffff',
          minWidth: 160,
          textAlign: 'center' as const,
        },
      });
    });
  });

  for (const page of flat) {
    if (page.parentId) {
      edges.push({
        id: `e-${page.parentId}-${page.id}`,
        source: page.parentId,
        target: page.id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8' },
      });
    }
  }

  return { nodes, edges };
}

// --- Komponent panelu bocznego ---

function SidePanel({
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
              if (confirm('Na pewno usunąć tę stronę? Sekcje zostaną usunięte, dzieci przeniesione do rodzica.')) {
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

// --- Dialog dodawania strony ---

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
            // Auto-generuj slug
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

export function SiteStructureGraph({ pages, onCreatePage, onUpdatePage, onDeletePage, onReorder }: Props) {
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(null);
  const [addDialog, setAddDialog] = useState<{ parentId: string | null } | null>(null);
  const [error, setError] = useState('');
  const [localPages, setLocalPages] = useState(pages);

  useEffect(() => {
    setLocalPages(pages);
  }, [pages]);

  const { nodes: initialNodes, edges } = useMemo(() => buildNodesAndEdges(localPages), [localPages]);
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
      const page = flat.find((p) => p.id === node.id);
      if (page) {
        setSelectedPage(page);
        setAddDialog(null);
      }
    },
    [flat]
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

  // Obsługa połączeń (zmiana rodzica)
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setError('');
      const result = await onUpdatePage(connection.target, { parentId: connection.source });
      if (result.error) setError(result.error);
    },
    [onUpdatePage]
  );

  return (
    <div className="relative w-full h-[600px] border border-border rounded-lg overflow-hidden bg-gray-50">
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
        fitViewOptions={{ padding: 0.3 }}
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
            }}
          >
            + Dodaj stronę
          </Button>
        </Panel>

        <Panel position="top-right">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-white/80 px-2 py-1 rounded border">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Strona główna</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Widoczna</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Ukryta</span>
          </div>
        </Panel>
      </ReactFlow>

      {selectedPage && (
        <SidePanel
          page={selectedPage}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedPage(null)}
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
