'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  uploadImage,
  updateImageCaption,
  updateImageSection,
  updateImageOrder,
  deleteImage,
  getGalleryThumbs,
} from '@/actions/gallery';

type GalleryItem = {
  id: string;
  webpUrl: string;
  thumbUrl: string | null;
  altPl: string | null;
  altEn: string | null;
  captionPl: string | null;
  captionEn: string | null;
  order: number;
};

type Props = {
  sectionId: string;
  initialImages: GalleryItem[];
};

export function SectionGalleryEditor({ sectionId, initialImages }: Props) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerThumbs, setPickerThumbs] = useState<{ id: string; webpUrl: string; thumbUrl: string | null; altPl: string | null }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload ────────────────────────────────────────────

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('sectionId', sectionId);
        const result = await uploadImage(fd);
        if (result.success && result.image) {
          const img = result.image as GalleryItem;
          setImages((prev) => [...prev, img]);
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [sectionId]);

  // ── Unassign (nie kasuje, tylko odpina od sekcji) ─────

  const handleUnassign = async (id: string) => {
    if (!confirm('Odpiąć zdjęcie od tej sekcji? (Zdjęcie pozostanie w galerii głównej)')) return;
    const result = await updateImageSection(id, null);
    if (result.success) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  // ── Delete (kasuje z galerii i Blob) ─────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Trwale usunąć zdjęcie?')) return;
    const result = await deleteImage(id);
    if (result.success) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  // ── Drag & drop reorder ───────────────────────────────

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newImages = [...images];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(targetIdx, 0, moved);
    setImages(newImages);
    setDragIdx(null);
    setDragOverIdx(null);
    await updateImageOrder(newImages.map((img) => img.id));
  };

  // ── Caption save ──────────────────────────────────────

  const handleSaveCaption = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const fd = new FormData(e.currentTarget);
    const captionPl = (fd.get('captionPl') as string) || null;
    const captionEn = (fd.get('captionEn') as string) || null;
    await updateImageCaption(editItem.id, captionPl, captionEn);
    setImages((prev) =>
      prev.map((img) => img.id === editItem.id ? { ...img, captionPl, captionEn } : img),
    );
    setEditItem(null);
  };

  // ── Picker (dodaj z istniejącej galerii) ──────────────

  const openPicker = async () => {
    const thumbs = await getGalleryThumbs();
    // Odfiltruj już przypisane do tej sekcji
    const assignedIds = new Set(images.map((i) => i.id));
    setPickerThumbs(thumbs.filter((t) => !assignedIds.has(t.id)));
    setShowPicker(true);
  };

  const handlePickerSelect = async (id: string) => {
    const result = await updateImageSection(id, sectionId);
    if (result.success) {
      const picked = pickerThumbs.find((t) => t.id === id);
      if (picked) {
        setImages((prev) => [
          ...prev,
          { id: picked.id, webpUrl: picked.webpUrl, thumbUrl: picked.thumbUrl, altPl: picked.altPl, altEn: null, captionPl: null, captionEn: null, order: prev.length },
        ]);
      }
      setShowPicker(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Galeria sekcji</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload + picker */}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Przesyłanie...' : '+ Upload'}
          </Button>
          <Button size="sm" variant="outline" onClick={openPicker}>
            Dodaj z galerii
          </Button>
        </div>

        {/* Grid z obrazami */}
        {images.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Brak zdjęć w tej sekcji
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className={`group relative aspect-square rounded overflow-hidden border bg-muted cursor-grab transition-all ${dragOverIdx === idx ? 'ring-2 ring-primary' : ''} ${dragIdx === idx ? 'opacity-50' : ''}`}
              >
                <Image
                  src={img.thumbUrl || img.webpUrl}
                  alt={img.altPl || ''}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 p-1">
                  <Button size="sm" variant="secondary" className="text-[10px] h-6 px-2 w-full" onClick={() => setEditItem(img)}>
                    Opis
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 w-full" onClick={() => handleUnassign(img.id)}>
                    Odepnij
                  </Button>
                  <Button size="sm" variant="destructive" className="text-[10px] h-6 px-2 w-full" onClick={() => handleDelete(img.id)}>
                    Usuń
                  </Button>
                </div>
                <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dialog edycji opisu */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Opis zdjęcia</DialogTitle>
            </DialogHeader>
            {editItem && (
              <form onSubmit={handleSaveCaption} className="space-y-3">
                <div className="aspect-video relative rounded overflow-hidden bg-muted">
                  <Image src={editItem.webpUrl} alt="" fill className="object-contain" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="captionPl">Podpis (PL)</Label>
                  <Input id="captionPl" name="captionPl" defaultValue={editItem.captionPl || ''} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="captionEn">Podpis (EN)</Label>
                  <Input id="captionEn" name="captionEn" defaultValue={editItem.captionEn || ''} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Anuluj</Button>
                  <Button type="submit">Zapisz</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Picker z galerii głównej */}
        <Dialog open={showPicker} onOpenChange={setShowPicker}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Wybierz zdjęcie z galerii</DialogTitle>
            </DialogHeader>
            {pickerThumbs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Brak wolnych zdjęć w galerii
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                {pickerThumbs.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    className="relative aspect-square rounded overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                    onClick={() => handlePickerSelect(img.id)}
                    title={img.altPl || ''}
                  >
                    <Image
                      src={img.thumbUrl || img.webpUrl}
                      alt={img.altPl || ''}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
