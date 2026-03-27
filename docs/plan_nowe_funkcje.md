# Plan implementacji nowych funkcji

> Data: 2026-03-28
> Dotyczy: edytor treści (admin), galeria, optymalizacja obrazow

---

## Spis tresci

1. [Formatowanie tekstu (znaczniki HTML)](#1-formatowanie-tekstu-znaczniki-html)
2. [Zarzadzanie galeria zdjec w sekcjach](#2-zarzadzanie-galeria-zdjec-w-sekcjach)
3. [Automatyczna optymalizacja obrazow dla mobile](#3-automatyczna-optymalizacja-obrazow-dla-mobile)

---

## 1. Formatowanie tekstu (znaczniki HTML)

### Stan obecny

- Edytor treści (`SectionEditor.tsx`) używa `<Input>` i `<Textarea>` — plain text, brak formatowania.
- Frontend (`HomeClient.tsx`) renderuje tekst jako `{paragraph}` wewnątrz `<p>` — nie interpretuje HTML.
- Treść przechowywana w JSON (`contentPl`/`contentEn`) jako zwykłe stringi.

### Cel

Umożliwić administratorowi formatowanie tekstów w edytorze za pomocą znaczników HTML: **bold**, *italic*, linki, listy, nagłówki — z podglądem na żywo.

### Proponowane rozwiązanie

**Wariant A (rekomendowany): Edytor WYSIWYG z Tiptap**

Tiptap to lekki, rozszerzalny edytor oparty na ProseMirror. Generuje czysty HTML.

#### A1. Nowa zależność

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline
```

Pakiet `@tiptap/starter-kit` zawiera: bold, italic, strike, headings (h1-h6), bullet list, ordered list, blockquote, code, horizontal rule.

#### A2. Komponent `RichTextEditor`

Nowy plik: `components/admin/RichTextEditor.tsx`

```
Funkcjonalność:
- Toolbar z przyciskami: B, I, U, S, Link, H2, H3, Lista, Lista numerowana, Cytat
- Podgląd WYSIWYG (edytor wyświetla sformatowany tekst)
- Wyjście: czysty HTML string
- Props: value (HTML string), onChange(html: string), placeholder
```

#### A3. Zmiana w SectionEditor.tsx

Dla pól z `multiline: true` → zamiana `<Textarea>` na `<RichTextEditor>`:

```
Przed:  <Textarea value={value} onChange={...} rows={5} />
Po:     <RichTextEditor value={value} onChange={(html) => setFields(...)} />
```

Pola, których dotyczy zmiana:
- `koncept.body`, `koncept.intro`
- `miejsce.body`, `miejsce.intro`
- `rezerwacja.description`, `rezerwacja.description2`, `rezerwacja.info`

#### A4. Zmiana renderowania na frontendzie (HomeClient.tsx)

Obecnie:
```tsx
<p>{paragraph}</p>
```

Po zmianie — bezpieczne renderowanie HTML:
```tsx
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

**Sanityzacja** — użyć `DOMPurify` (lub sanityzacja server-side):
```bash
npm install isomorphic-dompurify
```

Dozwolone tagi: `b, strong, i, em, u, s, a, h2, h3, p, br, ul, ol, li, blockquote, code`.
Dozwolone atrybuty: `href, target, rel` (tylko na `<a>`).

#### A5. Migracja istniejących danych

Istniejący plain text → zamiana `\n\n` na `<p>...</p>` jednorazowym skryptem migracyjnym.

#### A6. Pliki do zmiany/dodania

| Plik | Akcja |
|------|-------|
| `components/admin/RichTextEditor.tsx` | **NOWY** — komponent edytora WYSIWYG |
| `app/admin/content/[slug]/SectionEditor.tsx` | ZMIANA — użycie RichTextEditor dla multiline |
| `components/HomeClient.tsx` | ZMIANA — renderowanie HTML zamiast plain text |
| `lib/sanitize.ts` | **NOWY** — helper sanityzacji HTML |
| `prisma/migrations/...` | Skrypt migracyjny danych (jednorazowy) |
| `package.json` | ZMIANA — nowe zależności (tiptap, dompurify) |

#### A7. Bezpieczeństwo

- Sanityzacja HTML **zawsze** po stronie serwera przed zapisem do DB (w `actions/content.ts`).
- Dodatkowa sanityzacja po stronie klienta przed `dangerouslySetInnerHTML`.
- Whitelist tagów i atrybutów — blokada `<script>`, `<iframe>`, `onerror`, `onclick` itp.

---

**Wariant B (prostszy): Markdown**

Zamiast WYSIWYG — edycja w Markdown, konwersja do HTML przy renderowaniu.

- Zależność: `marked` + `dompurify`
- Prostszy UX (textarea z podglądem poniżej), ale wymaga znajomości Markdown od admina
- Mniejszy koszt implementacji, ale gorsze doświadczenie użytkownika

**Rekomendacja: Wariant A** — docelowa grupa (admin nie-techniczny) potrzebuje WYSIWYG.

---

## 2. Zarządzanie galerią zdjęć w sekcjach

### Stan obecny

- Model `GalleryImage` istnieje w bazie z polami: `originalUrl`, `webpUrl`, `thumbUrl`, `altPl`, `altEn`, `order`, `sectionId`.
- `GalleryManager.tsx` (strona `/admin/gallery`) obsługuje: upload, usuwanie, drag-to-reorder, edycję alt text, przypisanie do sekcji.
- `SectionEditor.tsx` — tylko picker obrazu tła (bgImage), brak zarządzania galerią sekcji.
- `HomeClient.tsx` — renderuje galerię w expanded content (`renderExpandedContent`) z fallbackiem.
- **Brak**: lightboxa, opisu pod zdjęciem, zarządzania galerią z poziomu edytora sekcji.

### Cel

1. Zarządzanie galerią zdjęć sekcji bezpośrednio z edytora sekcji (dodawanie, usuwanie, zmiana kolejności, opisy).
2. Wyświetlanie zdjęcia/galerii w lightboxie (powiększonym oknie).

### Proponowane rozwiązanie

#### B1. Komponent `SectionGalleryEditor`

Nowy plik: `components/admin/SectionGalleryEditor.tsx`

Osadzony w `SectionEditor.tsx` poniżej karty "Wygląd" — widoczny dla sekcji, które mają galerię (`koncept`, `miejsce`).

```
Funkcjonalność:
- Lista zdjęć przypisanych do danej sekcji (filtr po sectionId)
- Drag & drop reorder (jak w GalleryManager)
- Upload nowego zdjęcia bezpośrednio do sekcji (przekazuje sectionId)
- Edycja opisu (captionPl/captionEn) — nowe pole w modelu
- Usuwanie zdjęcia z sekcji (unassign, nie kasuje z galerii)
- Przycisk "Dodaj z galerii" — picker z istniejących zdjęć
```

#### B2. Rozszerzenie modelu GalleryImage

Nowe pola w `prisma/schema.prisma`:

```prisma
model GalleryImage {
  ...istniejące pola...
  captionPl   String?    // Opis/podpis pod zdjęciem (PL)
  captionEn   String?    // Opis/podpis pod zdjęciem (EN)
}
```

Migracja:
```bash
npx prisma migrate dev --name add_gallery_captions
```

#### B3. Nowe server actions

Plik: `actions/gallery.ts` — rozszerzenie:

```
- updateImageCaption(id, captionPl, captionEn) — zapis opisu
- assignImageToSection(imageId, sectionId) — przypisanie istniejącego zdjęcia
- unassignImageFromSection(imageId) — odłączenie od sekcji (sectionId = null)
- getImagesForSection(sectionId) — zdjęcia danej sekcji, posortowane po order
```

#### B4. Komponent `Lightbox`

Nowy plik: `components/Lightbox.tsx`

```
Funkcjonalność:
- Overlay pełnoekranowy (fixed, z-50, bg-black/90)
- Wyświetla zdjęcie w pełnej rozdzielczości (webpUrl, nie thumbUrl)
- Nawigacja: strzałki lewo/prawo, klawisze ←/→, swipe na mobile
- Zamknięcie: przycisk X, klawisz Escape, klik poza zdjęciem
- Wyświetla opis (caption) pod zdjęciem jeśli istnieje
- Licznik: "3 / 12"
- Animacja wejścia/wyjścia (fade + scale)
- Opcjonalny tryb: pojedyncze zdjęcie lub galeria
```

Bez dodatkowych zależności — czysty React + CSS.

#### B5. Integracja lightboxa w HomeClient.tsx

Zmiana w `renderExpandedContent()`:

```
Obecne:
  <figure> → <Image /> — klik nic nie robi

Po zmianie:
  <figure onClick={() => openLightbox(gallery, index)}> → <Image />
  + kursor pointer
  + ikona lupy/powiększenia w rogu

Na końcu komponentu:
  <Lightbox images={...} startIndex={...} open={...} onClose={...} />
```

Analogiczna zmiana dla galerii w widoku rezerwacji (sekcja `reservation-visual-gallery`).

#### B6. Pliki do zmiany/dodania

| Plik | Akcja |
|------|-------|
| `components/admin/SectionGalleryEditor.tsx` | **NOWY** — zarządzanie galerią sekcji |
| `components/Lightbox.tsx` | **NOWY** — komponent lightboxa |
| `app/admin/content/[slug]/SectionEditor.tsx` | ZMIANA — osadzenie SectionGalleryEditor |
| `components/HomeClient.tsx` | ZMIANA — kliknięcie otwiera lightbox |
| `actions/gallery.ts` | ZMIANA — nowe akcje (caption, assign/unassign) |
| `prisma/schema.prisma` | ZMIANA — pola captionPl, captionEn |
| `lib/content.ts` | ZMIANA — zwracanie captionPl/captionEn z DB |
| `app/globals.css` | ZMIANA — style lightboxa |

---

## 3. Automatyczna optymalizacja obrazów dla mobile

### Stan obecny

- Sharp (`actions/gallery.ts`) generuje 3 wersje: original, WebP (full-size), thumbnail (400px).
- `next/image` jest używany w `GalleryManager` i `HomeClient` z prop `sizes` — Next.js automatycznie serwuje odpowiedni rozmiar.
- **Brak**: dedykowanego rozmiaru mobilnego (np. 800px) — mobile pobiera full-size WebP, co jest zbyt ciężkie.
- `next.config.ts` nie ma konfiguracji `images.deviceSizes` ani `images.imageSizes`.

### Cel

Automatyczne generowanie mobilnej wersji obrazu przy uploadzie + konfiguracja Next.js Image do serwowania odpowiednich rozmiarów.

### Proponowane rozwiazanie

#### C1. Nowy rozmiar obrazu przy uploadzie

Zmiana w `actions/gallery.ts` — dodanie wersji mobilnej:

```
Obecny pipeline:
  original → full WebP (82%) → thumb (400px, 82%)

Nowy pipeline:
  original → full WebP (82%) → mobile WebP (800px, 80%) → thumb (400px, 82%)
```

Nowy plik: `{id}_mobile.webp` — 800px szerokości, quality 80.

#### C2. Rozszerzenie modelu GalleryImage

```prisma
model GalleryImage {
  ...istniejące pola...
  mobileUrl   String?    // Wersja mobilna (800px width)
}
```

Migracja:
```bash
npx prisma migrate dev --name add_mobile_image_url
```

#### C3. Jednorazowy skrypt migracji istniejących zdjęć

Skrypt `scripts/generate-mobile-images.ts`:

```
1. Pobierz wszystkie GalleryImage z DB
2. Dla każdego: wczytaj originalUrl z dysku
3. Sharp: resize(800) + webp(80) → zapisz jako {id}_mobile.webp
4. Update DB: mobileUrl = fileUrl(mobileName)
```

#### C4. Konfiguracja next/image

Zmiana w `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  images: {
    deviceSizes: [640, 800, 1080, 1200, 1920],  // breakpointy urządzeń
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  // ...reszta
};
```

#### C5. Integracja w frontendzie

Zmiana w `HomeClient.tsx` — `renderExpandedContent()` i galeria rezerwacji:

```tsx
// Obecne:
<Image src={image.src} ... sizes="(max-width: 768px) 92vw, 40vw" />

// Po zmianie — użycie srcSet z mobilną wersją:
<picture>
  <source media="(max-width: 768px)" srcSet={image.mobileSrc} type="image/webp" />
  <Image src={image.src} ... sizes="(max-width: 768px) 92vw, 40vw" />
</picture>
```

**Alternatywa (prostsza)**: Poleganie wyłącznie na `next/image` z poprawnym `sizes` prop — Next.js sam wybierze odpowiedni rozmiar z `deviceSizes`. Wymaga to jednak, żeby obrazy były serwowane przez Next.js Image Optimization (nie przez statyczny `/api/uploads/`).

#### C6. Zmiana serwowania obrazów

Obecny endpoint `/api/uploads/[...path]/route.ts` serwuje pliki statycznie z dysku.

**Opcja A (rekomendowana)**: Przekierowanie obrazów galerii przez `next/image`:
- Zmiana `src` w frontendzie z `/api/uploads/gallery/x.webp` na ścieżkę obsługiwaną przez Next.js Image Optimization
- Konfiguracja `remotePatterns` lub `localPatterns` w `next.config.ts`
- Next.js automatycznie generuje odpowiednie rozmiary

**Opcja B**: Zachowanie obecnego endpointu + dodanie parametru `?w=800` z ręcznym serwowaniem wersji mobilnej.

#### C7. Pliki do zmiany/dodania

| Plik | Akcja |
|------|-------|
| `actions/gallery.ts` | ZMIANA — generowanie wersji mobilnej |
| `prisma/schema.prisma` | ZMIANA — pole mobileUrl |
| `next.config.ts` | ZMIANA — konfiguracja images |
| `components/HomeClient.tsx` | ZMIANA — użycie mobilnych źródeł |
| `lib/content.ts` | ZMIANA — zwracanie mobileUrl |
| `scripts/generate-mobile-images.ts` | **NOWY** — migracja istniejących obrazów |
| `app/api/uploads/[...path]/route.ts` | ZMIANA (opcjonalnie) — obsługa parametru rozmiaru |

---

## Podsumowanie zmian

### Nowe zależności

| Pakiet | Cel | Rozmiar (gzip) |
|--------|-----|-----------------|
| `@tiptap/react` | Edytor WYSIWYG | ~45 kB |
| `@tiptap/starter-kit` | Rozszerzenia edytora | ~25 kB |
| `@tiptap/extension-link` | Obsługa linków | ~3 kB |
| `@tiptap/extension-underline` | Podkreślenie | ~1 kB |
| `isomorphic-dompurify` | Sanityzacja HTML | ~15 kB |

### Zmiany w schemacie DB

```prisma
model GalleryImage {
  + captionPl   String?
  + captionEn   String?
  + mobileUrl   String?
}
```

### Nowe pliki (5)

1. `components/admin/RichTextEditor.tsx`
2. `components/admin/SectionGalleryEditor.tsx`
3. `components/Lightbox.tsx`
4. `lib/sanitize.ts`
5. `scripts/generate-mobile-images.ts`

### Zmieniane pliki (8)

1. `app/admin/content/[slug]/SectionEditor.tsx`
2. `components/HomeClient.tsx`
3. `actions/gallery.ts`
4. `lib/content.ts`
5. `prisma/schema.prisma`
6. `next.config.ts`
7. `app/globals.css`
8. `package.json`

### Proponowana kolejność implementacji

| Krok | Funkcja | Szacowany zakres |
|------|---------|------------------|
| 1 | Rozszerzenie schematu DB (captionPl/En, mobileUrl) + migracja | Mały |
| 2 | Optymalizacja mobilna (pipeline Sharp + konfiguracja next/image) | Średni |
| 3 | Skrypt migracji istniejących obrazów | Mały |
| 4 | Edytor WYSIWYG (RichTextEditor + sanityzacja + integracja) | Duży |
| 5 | Zarządzanie galerią w sekcji (SectionGalleryEditor) | Średni |
| 6 | Lightbox (komponent + integracja w HomeClient) | Średni |
| 7 | Testy manualne, poprawki, edge cases | Średni |

---

## Ryzyka i uwagi

1. **XSS** — krytyczne: sanityzacja HTML musi być dwuetapowa (serwer + klient). Whitelist tagów.
2. **Migracja danych** — istniejący plain text musi zostać przekonwertowany do HTML. Backup przed migracją.
3. **Rozmiar bundla** — Tiptap doda ~90 kB (gzip) do admina. To bundle admin-only, nie wpływa na stronę publiczną.
4. **Dysk** — dodatkowa wersja mobilna zwiększy zużycie dysku o ~30-40% per obraz.
5. **Live preview** — edytor WYSIWYG musi wysyłać HTML przez postMessage; iframe musi renderować HTML.
