'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  uploadImage,
  deleteImage,
  updateImageOrder,
  updateImageAlt,
  updateImageSection,
} from '@/actions/gallery';
import { InfoTooltip } from '@/components/ui/info-tooltip';

type GalleryImage = {
  id: string;
  originalUrl: string;
  webpUrl: string;
  thumbUrl: string | null;
  altPl: string | null;
  altEn: string | null;
  order: number;
  sectionId: string | null;
  section: { slug: string; titlePl: string | null } | null;
  createdAt: Date;
};

type Section = {
  id: string;
  slug: string;
  titlePl: string | null;
};

type Props = {
  initialImages: GalleryImage[];
  sections: Section[];
};

export function GalleryManager({ initialImages, sections }: Props) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'uploading' | 'done' | 'error'>>({});
  const [editImage, setEditImage] = useState<GalleryImage | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload ──────────────────────────────────────────

  const handleUpload = useCallback(async (files: FileList) => {
    const fileList = Array.from(files);
    setUploading(true);
    setUploadError(null);
    setUploadStatuses(Object.fromEntries(fileList.map((f) => [f.name, 'uploading' as const])));

    const results = await Promise.allSettled(
      fileList.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const result = await uploadImage(fd);
        if ('error' in result) throw new Error(result.error as string);
        setUploadStatuses((prev) => ({ ...prev, [file.name]: 'done' }));
        return result.image;
      }),
    );

    const newImages: GalleryImage[] = [];
    const errors: string[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        newImages.push(r.value as unknown as GalleryImage);
      } else if (r.status === 'rejected') {
        setUploadStatuses((prev) => ({ ...prev, [fileList[i].name]: 'error' }));
        errors.push(`${fileList[i].name}: ${r.reason?.message ?? 'Błąd'}`);
      }
    });

    if (newImages.length > 0) setImages((prev) => [...prev, ...newImages]);
    if (errors.length > 0) setUploadError(errors.join(' • '));

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    setTimeout(() => setUploadStatuses({}), 4000);
  }, []);

  // ── Drop zone ─────────────────────────────────────

  const handleDropUpload = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload],
  );

  // ── Delete ────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Na pewno usunąć to zdjęcie?')) return;
    const result = await deleteImage(id);
    if ('success' in result && result.success) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  // ── Drag & drop reorder ───────────────────────────

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const prevImages = images;
    const newImages = [...images];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(targetIdx, 0, moved);
    setImages(newImages);
    setDragIdx(null);
    setDragOverIdx(null);

    const result = await updateImageOrder(newImages.map((img) => img.id));
    if (result && 'error' in result) {
      setImages(prevImages);
    }
  };

  // ── Save alt text ─────────────────────────────────

  const handleSaveAlt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editImage) return;

    const fd = new FormData(e.currentTarget);
    const altPl = (fd.get('altPl') as string) || null;
    const altEn = (fd.get('altEn') as string) || null;
    const sectionId = (fd.get('sectionId') as string) || null;

    await updateImageAlt(editImage.id, altPl, altEn);
    if (sectionId !== editImage.sectionId) {
      await updateImageSection(editImage.id, sectionId);
    }

    setImages((prev) =>
      prev.map((img) =>
        img.id === editImage.id
          ? {
              ...img,
              altPl,
              altEn,
              sectionId,
              section: sectionId
                ? sections.find((s) => s.id === sectionId) ?? null
                : null,
            }
          : img,
      ),
    );
    setEditImage(null);
  };

  return (
    <>
      {/* Upload zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropUpload}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
          >
            <p className="text-muted-foreground mb-3">
              Przeciągnij zdjęcia tutaj lub kliknij przycisk
            </p>
            {uploadError && (
              <p className="text-destructive text-sm mb-3">{uploadError}</p>
            )}
            {Object.keys(uploadStatuses).length > 0 && (
              <ul className="text-xs text-left mb-3 space-y-1 max-w-xs mx-auto">
                {Object.entries(uploadStatuses).map(([name, status]) => (
                  <li key={name} className="flex items-center gap-2 truncate">
                    <span className={
                      status === 'done' ? 'text-green-500' :
                      status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                    }>
                      {status === 'done' ? '✓' : status === 'error' ? '✗' : '…'}
                    </span>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `Przesyłanie (${Object.values(uploadStatuses).filter(s => s === 'done').length}/${Object.keys(uploadStatuses).length})…` : 'Wybierz pliki'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Pliki są automatycznie konwertowane do WebP — pełna rozdzielczość, mobilna (800px) i miniatura (400px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {images.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Brak zdjęć w galerii. Dodaj pierwsze zdjęcie powyżej.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              className={`group relative rounded-lg overflow-hidden border bg-card cursor-grab active:cursor-grabbing transition-all ${
                dragOverIdx === idx ? 'ring-2 ring-primary scale-[1.02]' : ''
              } ${dragIdx === idx ? 'opacity-50' : ''}`}
            >
              <div className="aspect-square relative">
                <Image
                  src={img.thumbUrl || img.webpUrl}
                  alt={img.altPl || 'Zdjęcie galerii'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>

              {/* Overlay z akcjami */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditImage(img)}
                >
                  Edytuj
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(img.id)}
                >
                  Usuń
                </Button>
              </div>

              {/* Badge sekcji */}
              {img.section && (
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                  {img.section.titlePl || img.section.slug}
                </span>
              )}

              {/* Numer kolejności */}
              <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dialog edycji */}
      <Dialog open={!!editImage} onOpenChange={(open) => !open && setEditImage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edycja zdjęcia</DialogTitle>
          </DialogHeader>

          {editImage && (
            <form onSubmit={handleSaveAlt} className="space-y-4">
              <div className="aspect-video relative rounded overflow-hidden bg-muted">
                <Image
                  src={editImage.webpUrl}
                  alt={editImage.altPl || ''}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altPl" className="flex items-center gap-1.5">Alt text (PL) <InfoTooltip text="Opis obrazka dla SEO i dostępności. Opisz co widać na zdjęciu (do 125 znaków)." /></Label>
                <Input
                  id="altPl"
                  name="altPl"
                  defaultValue={editImage.altPl || ''}
                  placeholder="Opis zdjęcia po polsku"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altEn" className="flex items-center gap-1.5">Alt text (EN) <InfoTooltip text="Opis obrazka dla SEO i dostępności. Opisz co widać na zdjęciu (do 125 znaków)." /></Label>
                <Input
                  id="altEn"
                  name="altEn"
                  defaultValue={editImage.altEn || ''}
                  placeholder="Image description in English"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sectionId">Sekcja</Label>
                <select
                  id="sectionId"
                  name="sectionId"
                  defaultValue={editImage.sectionId || ''}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">— Bez przypisania —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titlePl || s.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditImage(null)}
                >
                  Anuluj
                </Button>
                <Button type="submit">Zapisz</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
