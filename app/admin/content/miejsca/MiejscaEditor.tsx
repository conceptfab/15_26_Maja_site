'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateContent } from '@/actions/content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { jsonToRecord } from '@/lib/json-utils';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SectionGalleryEditor } from '@/components/admin/SectionGalleryEditor';
import { Input } from '@/components/ui/input';

type SectionData = {
  id: string;
  slug: string;
  contentPl: unknown;
  contentEn: unknown;
  isVisible: boolean;
  titlePl: string | null;
  titleEn: string | null;
};

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

const FIELDS: Record<string, { label: string; description: string; multiline?: boolean }> = {
  miejsca_title: { label: 'Tytuł', description: 'Nagłówek widoku MIEJSCA (np. "Zarezerwuj swój czas")' },
  miejsca_description: { label: 'Opis główny', description: 'Tekst pod tytułem', multiline: true },
  miejsca_description2: { label: 'Opis dodatkowy', description: 'Drugi akapit', multiline: true },
};

type Props = {
  section: SectionData;
  galleryImages: GalleryItem[];
};

export function MiejscaEditor({ section, galleryImages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeLang, setActiveLang] = useState<'pl' | 'en'>('pl');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const [fieldsPl, setFieldsPl] = useState(() => jsonToRecord(section.contentPl));
  const [fieldsEn, setFieldsEn] = useState(() => jsonToRecord(section.contentEn));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendLivePreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: 'cms-live-preview',
      slug: 'miejsce',
      contentPl: { ...fieldsPl },
      contentEn: { ...fieldsEn },
    }, '*');
  }, [fieldsPl, fieldsEn]);

  useEffect(() => {
    sendLivePreview();
  }, [sendLivePreview]);

  const reloadPreview = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      // Merge: zachowaj istniejące pola sekcji miejsce, nadpisz tylko miejsca_*
      const existingPl = jsonToRecord(section.contentPl);
      const existingEn = jsonToRecord(section.contentEn);

      const result = await updateContent('miejsce', {
        contentPl: { ...existingPl, ...fieldsPl },
        contentEn: { ...existingEn, ...fieldsEn },
      });

      if ('error' in result) {
        setMessage({ type: 'error', text: result.error as string });
      } else {
        setMessage({ type: 'success', text: 'Zapisano!' });
        router.refresh();
        setTimeout(reloadPreview, 800);
      }
    });
  };

  const renderFields = (lang: 'pl' | 'en') => {
    const fields = lang === 'pl' ? fieldsPl : fieldsEn;
    const setFields = lang === 'pl' ? setFieldsPl : setFieldsEn;

    return (
      <div className="space-y-4">
        {Object.entries(FIELDS).map(([key, meta]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${lang}-${key}`}>{meta.label}</Label>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
            {meta.multiline ? (
              <RichTextEditor
                value={fields[key] ?? ''}
                onChange={(html) => setFields((prev) => ({ ...prev, [key]: html }))}
                placeholder={meta.description}
              />
            ) : (
              <Input
                id={`${lang}-${key}`}
                value={fields[key] ?? ''}
                onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/content" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Treści
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-xl font-bold">MIEJSCA</h1>
          <span className="text-xs text-muted-foreground">Widok po kliknięciu "MIEJSCA" w menu</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reloadPreview}>Przeładuj podgląd</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(380px,1fr)_1.5fr] gap-6">
        <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as 'pl' | 'en')}>
            <TabsList>
              <TabsTrigger value="pl">PL</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>
            <Card className="mt-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Treść ({activeLang === 'pl' ? 'Polski' : 'English'})</CardTitle>
              </CardHeader>
              <CardContent>
                <TabsContent value="pl" className="mt-0">{renderFields('pl')}</TabsContent>
                <TabsContent value="en" className="mt-0">{renderFields('en')}</TabsContent>
              </CardContent>
            </Card>
          </Tabs>

          <SectionGalleryEditor sectionId={section.id} initialImages={galleryImages} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Podgląd strony</p>
            <p className="text-xs text-muted-foreground">Zapisz zmiany → podgląd odświeży się automatycznie</p>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-black" style={{ height: 'calc(100vh - 180px)' }}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src="/?view=miejsca"
              className="w-full h-full border-0"
              title="Podgląd MIEJSCA"
              onLoad={() => sendLivePreview()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
