'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { updateContent } from '@/actions/content';
import { getGalleryThumbs } from '@/actions/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { jsonToRecord } from '@/lib/json-utils';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SectionGalleryEditor } from '@/components/admin/SectionGalleryEditor';

type SectionData = {
  id: string;
  slug: string;
  order: number;
  isVisible: boolean;
  titlePl: string | null;
  titleEn: string | null;
  contentPl: unknown;
  contentEn: unknown;
  bgImage: string | null;
  bgColor: string | null;
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

// Slug → anchor ID na stronie głównej (do scrollowania iframe)
const SLUG_TO_ANCHOR: Record<string, string> = {
  hero: 'hero-start',
  rezerwacja: 'hero-start',
  koncept: 'sec2-wrapper',
  miejsce: 'sec3-wrapper',
  menu: 'hero-start',
  stopka: 'sec4-wrapper',
};

// Slug → widok menu do aktywacji w podglądzie
const SLUG_TO_VIEW: Record<string, string> = {
  rezerwacja: 'rezerwuj',
};

// Slug → czytelne nazwy pól
const FIELD_LABELS: Record<string, Record<string, { label: string; description: string; multiline?: boolean }>> = {
  hero: {
    heading: { label: 'Nagłówek główny', description: 'Duży tekst na hero (np. YOUR SPECIAL TIME)' },
    subheading: { label: 'Podtytuł', description: 'Tekst pod nagłówkiem (np. HOMMM)' },
  },
  koncept: {
    heading: { label: 'Nagłówek sekcji', description: 'Główny tytuł (np. YOUR SPECIAL TIME)' },
    subheading: { label: 'Podtytuł', description: 'Mniejszy tekst pod tytułem (np. KONCEPT HOMMM)' },
    body: { label: 'Treść główna', description: 'Akapit widoczny na stronie (skrócony widok)', multiline: true },
    intro: { label: 'Wstęp (rozwinięcie)', description: 'Krótki wstęp po kliknięciu "Czytaj więcej"', multiline: true },
  },
  miejsce: {
    heading: { label: 'Nagłówek sekcji', description: 'Główny tytuł (np. YOUR SPECIAL PLACE)' },
    subheading: { label: 'Podtytuł', description: 'Pytanie/hasło pod tytułem' },
    body: { label: 'Treść główna', description: 'Akapit widoczny na stronie (skrócony widok)', multiline: true },
    intro: { label: 'Wstęp (rozwinięcie)', description: 'Krótki wstęp po kliknięciu "Czytaj więcej"', multiline: true },
  },
  rezerwacja: {
    checkin: { label: 'Etykieta: zameldowanie', description: 'Tekst przy polu daty przyjazdu' },
    checkout: { label: 'Etykieta: wymeldowanie', description: 'Tekst przy polu daty wyjazdu' },
    guests_label: { label: 'Etykieta: goście', description: 'Tekst przy selektorze gości' },
    submit: { label: 'Przycisk rezerwacji', description: 'Tekst na głównym przycisku' },
    note: { label: 'Notatka pod przyciskiem', description: 'Informacja o płatności' },
    clear: { label: 'Przycisk czyszczenia', description: 'Tekst przycisku "Wyczyść daty"' },
    info: { label: 'Informacja o rezerwacji', description: 'Tekst pod systemem rezerwacji', multiline: true },
    night_one: { label: 'Noc (1)', description: 'Odmiana: 1 noc' },
    night_few: { label: 'Noce (2-4)', description: 'Odmiana: 2 noce' },
    night_many: { label: 'Nocy (5+)', description: 'Odmiana: 5 nocy' },
    guest_one: { label: 'Gość (1)', description: 'Odmiana: 1 gość' },
    guest_few: { label: 'Gości (2+)', description: 'Odmiana: 2 gości' },
  },
  menu: {
    koncept_label: { label: 'Link: Koncept', description: 'Nazwa pozycji menu nawigacyjnego' },
    miejsca_label: { label: 'Link: Miejsca', description: 'Nazwa pozycji menu nawigacyjnego' },
    rezerwuj_label: { label: 'Link: Rezerwuj', description: 'Nazwa pozycji menu nawigacyjnego' },
  },
  stopka: {},
};

const GALLERY_SECTIONS = new Set(['koncept', 'miejsce']);

type Props = {
  section: SectionData;
  galleryImages: GalleryItem[];
};

export function SectionEditor({ section, galleryImages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeLang, setActiveLang] = useState<'pl' | 'en'>('pl');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const [titlePl, setTitlePl] = useState(section.titlePl ?? '');
  const [titleEn, setTitleEn] = useState(section.titleEn ?? '');
  const [fieldsPl, setFieldsPl] = useState(() => jsonToRecord(section.contentPl));
  const [fieldsEn, setFieldsEn] = useState(() => jsonToRecord(section.contentEn));
  const [bgImage, setBgImage] = useState(section.bgImage ?? '');
  const [bgColor, setBgColor] = useState(section.bgColor ?? '');
  const [isVisible, setIsVisible] = useState(section.isVisible);
  // Toast zamiast lokalnego message state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [galleryThumbs, setGalleryThumbs] = useState<{ id: string; webpUrl: string; thumbUrl: string | null; altPl: string | null }[]>([]);

  const fieldMeta = FIELD_LABELS[section.slug] ?? {};
  const allKeys = Object.keys(fieldMeta);

  // Wysyłaj live preview do iframe przy każdej zmianie pól
  const sendLivePreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: 'cms-live-preview',
      slug: section.slug,
      titlePl,
      titleEn,
      contentPl: { ...fieldsPl },
      contentEn: { ...fieldsEn },
      bgImage: bgImage || null,
      bgColor: bgColor || null,
    }, window.location.origin);
  }, [section.slug, titlePl, titleEn, fieldsPl, fieldsEn, bgImage, bgColor]);

  useEffect(() => {
    sendLivePreview();
  }, [sendLivePreview]);

  const anchor = SLUG_TO_ANCHOR[section.slug] ?? '';
  const viewParam = SLUG_TO_VIEW[section.slug];
  const iframeSrc = viewParam
    ? `/?view=${viewParam}`
    : `/#${anchor}`;

  const reloadPreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.location.reload();
        return;
      } catch { /* cross-origin — fallback to key change */ }
    }
    setIframeKey((k) => k + 1);
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateContent(section.slug, {
        titlePl: titlePl || null,
        titleEn: titleEn || null,
        contentPl: { ...fieldsPl },
        contentEn: { ...fieldsEn },
        bgImage: bgImage || null,
        bgColor: bgColor || null,
        isVisible,
      });

      if ('error' in result) {
        toast.error(result.error as string);
      } else {
        const saved = (result as { section: SectionData }).section;
        if (saved) {
          setBgImage(saved.bgImage ?? '');
          setBgColor(saved.bgColor ?? '');
          setTitlePl(saved.titlePl ?? '');
          setTitleEn(saved.titleEn ?? '');
          if (saved.contentPl) setFieldsPl(jsonToRecord(saved.contentPl));
          if (saved.contentEn) setFieldsEn(jsonToRecord(saved.contentEn));
          setIsVisible(saved.isVisible);
        }
        toast.success('Zapisano!');
        router.refresh();
        setTimeout(reloadPreview, 800);
      }
    });
  };

  const renderFieldsForLang = (lang: 'pl' | 'en') => {
    const fields = lang === 'pl' ? fieldsPl : fieldsEn;
    const setFields = lang === 'pl' ? setFieldsPl : setFieldsEn;
    const title = lang === 'pl' ? titlePl : titleEn;
    const setTitle = lang === 'pl' ? setTitlePl : setTitleEn;

    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`title-${lang}`}>
            {lang === 'pl' ? 'Nazwa sekcji' : 'Section name'}
          </Label>
          <Input
            id={`title-${lang}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'pl' ? 'Nazwa w panelu' : 'Name in admin'}
          />
        </div>
        <Separator />
        {allKeys.map((key) => {
          const meta = fieldMeta[key];
          const value = fields[key] ?? '';
          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`${lang}-${key}`}>
                {meta?.label ?? key}
              </Label>
              {meta?.description && (
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              )}
              {meta?.multiline ? (
                <>
                  <RichTextEditor
                    value={value}
                    onChange={(html) => setFields((prev) => ({ ...prev, [key]: html }))}
                    placeholder={meta.description}
                  />
                  <details className="mt-1">
                    <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                      Pomoc: dostępne formatowanie
                    </summary>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1 bg-muted/50 rounded p-3 leading-relaxed">
                      <p><strong>B</strong> — pogrubienie &nbsp;|&nbsp; <em>I</em> — kursywa &nbsp;|&nbsp; <u>U</u> — podkreślenie &nbsp;|&nbsp; <s>S</s> — przekreślenie</p>
                      <p><strong>H2 / H3</strong> — nagłówki (śródtytuły)</p>
                      <p><strong>•— / 1.</strong> — lista punktowana / numerowana</p>
                      <p><strong>❝</strong> — cytat blokowy</p>
                      <p><strong>🔗</strong> — link (zaznacz tekst, kliknij, wpisz URL)</p>
                      <p className="pt-1 border-t border-border">Klawisze: <kbd>Ctrl+B</kbd> pogrubienie, <kbd>Ctrl+I</kbd> kursywa, <kbd>Ctrl+Z</kbd> cofnij</p>
                    </div>
                  </details>
                </>
              ) : (
                <Input
                  id={`${lang}-${key}`}
                  value={value}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/content"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Treści
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-xl font-bold">{section.slug}</h1>
          <Badge variant={isVisible ? 'default' : 'secondary'}>
            {isVisible ? 'Widoczna' : 'Ukryta'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="text-sm">Widoczna</Label>
          </div>
          <Button variant="outline" size="sm" onClick={reloadPreview}>
            Przeładuj podgląd
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </div>


      {/* Split: Editor left, Preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(380px,1fr)_1.5fr] gap-6">
        {/* LEFT: Edit form */}
        <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as 'pl' | 'en')}>
            <TabsList>
              <TabsTrigger value="pl">PL</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>

            <Card className="mt-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Treść ({activeLang === 'pl' ? 'Polski' : 'English'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabsContent value="pl" className="mt-0">
                  {renderFieldsForLang('pl')}
                </TabsContent>
                <TabsContent value="en" className="mt-0">
                  {renderFieldsForLang('en')}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wygląd</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bgImage">Obraz tła (URL)</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgImage"
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    placeholder="/assets/bg.webp"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!showImagePicker) {
                        const thumbs = await getGalleryThumbs();
                        setGalleryThumbs(thumbs);
                      }
                      setShowImagePicker(!showImagePicker);
                    }}
                  >
                    {showImagePicker ? 'Ukryj' : 'Galeria'}
                  </Button>
                </div>
                {bgImage && (
                  <div className="mt-2 rounded border border-border overflow-hidden aspect-square w-32">
                    <img
                      src={bgImage}
                      alt="Podgląd tła"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {showImagePicker && (
                  <div className="grid grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto rounded border border-border p-2">
                    {galleryThumbs.length === 0 && (
                      <p className="col-span-4 text-xs text-muted-foreground text-center py-4">
                        Brak obrazów w galerii
                      </p>
                    )}
                    {galleryThumbs.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                          bgImage === img.webpUrl ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'
                        }`}
                        onClick={() => {
                          setBgImage(img.webpUrl);
                          setShowImagePicker(false);
                        }}
                        title={img.altPl ?? ''}
                      >
                        <img
                          src={img.thumbUrl ?? img.webpUrl}
                          alt={img.altPl ?? ''}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bgColor">Kolor tła</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgColor"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#1a1a1a"
                  />
                  {bgColor && (
                    <div
                      className="h-9 w-9 rounded border border-input shrink-0"
                      style={{ backgroundColor: bgColor }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery (tylko dla sekcji z galerią) */}
          {GALLERY_SECTIONS.has(section.slug) && (
            <SectionGalleryEditor
              sectionId={section.id}
              initialImages={galleryImages}
            />
          )}
        </div>

        {/* RIGHT: Real page preview in iframe */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Podgląd strony
            </p>
            <p className="text-xs text-muted-foreground">
              Zapisz zmiany &rarr; podgląd odświeży się automatycznie
            </p>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-black" style={{ height: 'calc(100vh - 180px)' }}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={iframeSrc}
              className="w-full h-full border-0"
              title="Podgląd strony"
              onLoad={() => {
                sendLivePreview();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
