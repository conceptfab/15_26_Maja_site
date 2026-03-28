# Raport audytu kodu — HOMMM (Maja Site)

**Data:** 2026-03-28
**Zakres:** Pełna analiza kodu pod kątem bezpieczeństwa, logiki, wydajności, optymalizacji i jakości kodu.
**Stack:** Next.js 15, React 19, Prisma 7 (Neon Postgres), Vercel Blob, Sharp, Nodemailer, Zod

---

## Spis treści

0. [PAGESPEED — Dlaczego wynik się nie zmienił](#0-pagespeed--dlaczego-wynik-się-nie-zmienił)
1. [KRYTYCZNE — Bezpieczeństwo](#1-krytyczne--bezpieczeństwo)
2. [WAŻNE — Bezpieczeństwo i logika](#2-ważne--bezpieczeństwo-i-logika)
3. [WYDAJNOŚĆ — Optymalizacje](#3-wydajność--optymalizacje)
4. [OPTYMALIZACJA GRAFIK](#4-optymalizacja-grafik)
5. [JAKOŚĆ KODU — Duplikacje i wzorce](#5-jakość-kodu--duplikacje-i-wzorce)
6. [DROBNE UWAGI](#6-drobne-uwagi)
7. [PODSUMOWANIE](#7-podsumowanie)

---

## 0. PAGESPEED — Dlaczego wynik się nie zmienił

### Diagnoza: co zrobiła ostatnia "optymalizacja"

Commit `d773fec` dodał:
1. **`@next/bundle-analyzer`** — narzędzie diagnostyczne (dev-only), nie wpływa na produkcyjny build
2. **`.browserslistrc`** z `last 2 versions, not dead, not ie 11` — identyczny z domyślnym targetem Next.js, zero wpływu na output

**Żadna z tych zmian nie dotyka rzeczywistych bottlenecków PageSpeed.**

---

### Prawdziwe przyczyny niskiego wyniku mobile (w kolejności wpływu)

#### 0.1 ⛔ Tła sekcji przez CSS `background-image` — OMIJAJĄ CAŁY SYSTEM OPTYMALIZACJI (LCP ~7s)

**Problem:** 4 sekcje używają CSS `background-image` zamiast `next/image`:

| Klasa CSS | Plik | Fallback | Rozmiar |
|-----------|------|----------|---------|
| `.bg-slider` | `globals.css:765` | `hero.webp` | 452 KB |
| `.bg-dark` | `globals.css:904` | `sec_3.webp` | 448 KB |
| `.bg-light` | `globals.css:912` | `footer.webp` | 156 KB |
| `.section-bg-secondary` | `globals.css:920` | `sec_2.webp` | 364 KB |

**Dlaczego to krytyczne:**
- **Brak responsywności** — telefon pobiera identyczny plik co monitor 4K (np. hero 1920px na ekranie 375px)
- **Brak konwersji AVIF** — mimo `formats: ['image/avif', 'image/webp']` w `next.config.ts`, CSS background-image omija Next.js Image Optimization. Przeglądarka dostaje surowy WebP z `public/`
- **3-poziomowy łańcuch odkrywania** — HTML → CSS (parsowanie) → dopiero wtedy przeglądarka dowiaduje się o obrazie. To dodaje ~500ms+ do LCP
- **Dynamiczne URL z DB** — `bgStyle()` w `HomeClient.tsx:168-175` ustawia `--section-bg` na URL z Blob Storage. Preload w `layout.tsx:78-83` ładuje tylko statyczny `/assets/hero.webp`, ale gdy DB zwraca inny URL, preload jest bezużyteczny
- **Brak preconnect do Blob Storage** — obrazy z `*.public.blob.vercel-storage.com` wymagają dodatkowego DNS + TLS handshake (~100-200ms)

**Porównanie mobile vs desktop:**

| Element | Desktop | Mobile | Różnica |
|---------|---------|--------|---------|
| Galeria (`<Image sizes="...">`) | 40vw (~768px) | 92vw (~640px) | ✅ Mobile mniejszy |
| Hero tło (CSS `background-image`) | 1920px, 452 KB | 1920px, 452 KB | ❌ IDENTYCZNE |
| sec_2 tło (CSS) | 1920px, 364 KB | 1920px, 364 KB | ❌ IDENTYCZNE |
| sec_3 tło (CSS) | 1920px, 448 KB | 1920px, 448 KB | ❌ IDENTYCZNE |
| footer tło (CSS) | 1920px, 156 KB | 1920px, 156 KB | ❌ IDENTYCZNE |

**Na mobile sumarycznie ~1.4 MB samych teł sekcji w pełnej rozdzielczości desktopowej.**

**Rozwiązanie (priorytet P0 dla PageSpeed):**

Opcja A — zamiana na `<Image>` z `fill` + `sizes` (najlepsza):
```tsx
// Zamiast CSS background-image:
<div className="section h-100vh" style={{ position: 'relative' }}>
  <Image
    src={heroSection?.bgImage || '/assets/hero.webp'}
    alt=""
    fill
    sizes="100vw"
    priority  // tylko dla hero (LCP)
    style={{ objectFit: 'cover', objectPosition: 'center 70%' }}
  />
  {/* treść sekcji z position: relative, z-index: 1 */}
</div>
```
Efekt: Next.js automatycznie serwuje AVIF 640px (~40-80 KB) na mobile zamiast WebP 1920px (452 KB).

Opcja B — ręczne warianty mobilne + media query w CSS (prostsza):
```css
.bg-slider {
  background-image: var(--section-bg, url('/assets/hero.webp'));
}
@media (max-width: 768px) {
  .bg-slider {
    background-image: var(--section-bg-mobile, url('/assets/hero-mobile.webp'));
  }
}
```
Wymaga przygotowania wariantów 800px przez sharp.

---

#### 0.2 ⛔ TypeKit CSS blokuje renderowanie (~500-700ms na mobile)

**Plik:** `app/layout.tsx:84-90`

```html
<!-- Komentarz mówi "async load" ale implementacja jest SYNCHRONICZNA -->
<link rel="preload" href="https://use.typekit.net/zpt0osi.css" as="style" />
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
```

- `<link rel="preload">` tuż nad `<link rel="stylesheet">` jest **redundantny** — nie daje żadnego przyspieszenia
- Synchroniczny `<link rel="stylesheet">` **blokuje renderowanie** całej strony do momentu pobrania i sparsowania
- Na mobile (3G/4G) to ~500-700ms czystego oczekiwania zanim cokolwiek się wyświetli
- TypeKit CSS dodatkowo pobiera pliki fontów — kolejne ~200-400ms

**Rozwiązanie — prawdziwy async load:**
```html
<link
  rel="stylesheet"
  href="https://use.typekit.net/zpt0osi.css"
  media="print"
  onLoad="this.media='all'"
/>
<noscript>
  <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
</noscript>
```
Efekt: strona renderuje się natychmiast z Geist (już załadowany przez `next/font`), TypeKit doładowuje się asynchronicznie.

---

#### 0.3 ⚠️ react-datepicker + CSS w głównym bundlu (~90 KB gzipped)

**Pliki:**
- `components/HomeClient.tsx:11` — `import DatePicker from 'react-datepicker'` (synchroniczny)
- `app/globals.css:1` — `@import 'react-datepicker/dist/react-datepicker.css'`

DatePicker jest potrzebny tylko w widoku `rezerwuj`/`miejsca`, ale trafia do initial bundle. Porównaj z `Lightbox` (linia 7) który jest poprawnie lazy-loaded: `dynamic(() => import('./Lightbox'), { ssr: false })`.

**Rozwiązanie:**
```tsx
const DatePicker = dynamic(() => import('react-datepicker'), { ssr: false });
```
Plus przeniesienie CSS datepickera do komponentu (CSS Modules lub import w lazy-loaded wrapper).

---

#### 0.4 ⚠️ Obraz gal_00.webp — 1.4 MB (nadmierny rozmiar)

**Plik:** `public/assets/gal_00.webp` (1,422,460 bytes)

Nawet jak na WebP, 1.4 MB jest ekstremalnie dużo. Typowy WebP o wymiarach 1920px powinien mieścić się w 200-400 KB (quality 80-85). Obraz prawdopodobnie ma zbyt wysoki quality lub nietypowe wymiary.

**Rozwiązanie:** Rekompresja przez sharp:
```bash
npx sharp-cli -i public/assets/gal_00.webp -o public/assets/gal_00.webp --webp --quality 82 --resize 1920
```
Oczekiwany rozmiar po rekompresji: ~200-350 KB (redukcja 75-85%).

---

#### 0.5 ⚠️ Brak preconnect do Vercel Blob Storage

**Plik:** `app/layout.tsx` — jest preconnect do TypeKit, ale brak preconnect do Blob Storage.

Obrazy z DB ładują się z `*.public.blob.vercel-storage.com`. Bez preconnect, przeglądarka musi wykonać DNS lookup + TLS handshake dopiero gdy napotka URL obrazu.

**Rozwiązanie:**
```html
<link rel="preconnect" href="https://lp1kkgv0aginmark.public.blob.vercel-storage.com" />
```
(dokładny hostname z Blob Store)

---

#### 0.6 ⚠️ logo.png — jedyny PNG, 74 KB

**Plik:** `public/assets/logo.png` (75,483 bytes)

Jedyny plik PNG w katalogu assets. Powinien być skonwertowany do WebP (~15-25 KB) lub SVG (jeśli wektorowy) dla spójności i mniejszego rozmiaru.

---

### Szacowany wpływ napraw na PageSpeed mobile

| Naprawa | Estymacja wpływu na LCP | Estymacja wpływu na FCP |
|---------|------------------------|------------------------|
| 0.1 Tła sekcji → `<Image>` | **-2 do -4s** (główny zysk) | ~0 |
| 0.2 TypeKit async | **-0.5 do -0.7s** | **-0.5 do -0.7s** |
| 0.3 Lazy DatePicker | ~0 | -0.1s (mniejszy bundle) |
| 0.4 Rekompresja gal_00.webp | -0.3 do -1s (gdy widoczny) | ~0 |
| 0.5 Preconnect Blob | -0.1 do -0.2s | ~0 |
| **ŁĄCZNIE** | **-3 do -6s** | **-0.5 do -1s** |

Sama zmiana 0.1 (tła → `<Image>`) powinna dać największy skok wyniku, bo LCP to ~45% wagi PageSpeed Performance score.

---

## 1. KRYTYCZNE — Bezpieczeństwo

### 1.1 ⛔ Sekrety `.env` BYŁY commitowane do git — WYMAGANA NATYCHMIASTOWA ROTACJA

**Pliki:** `.env`, historia git (commity `af72859`, `49a82e2`)
**Dotkliwość:** KRYTYCZNA

Plik `.env` zawierający pełne dane uwierzytelniające był commitowany do repozytorium (2 commity). Choć `.gitignore` teraz wyklucza `.env`, **historia git zachowuje pełną treść**. Każda osoba z dostępem do repo (lub jego klonu) może odczytać:

- **SMTP_PASS** — hasło do serwera pocztowego
- **JWT_SECRET** — klucz podpisu sesji (umożliwia fałszowanie tokenów)
- **ADMIN_SECRET_CODE** — kod logowania admina
- **BLOB_READ_WRITE_TOKEN** — pełny dostęp do Vercel Blob
- **VERCEL_TOKEN** — token API Vercel (deploy, env, domains)
- **DATABASE_URL** — pełny connection string do bazy Neon (z hasłem)
- **NEON_API_KEY** — klucz API Neon
- **UMAMI_API_KEY** — klucz API analityki

**Wymagane działania:**
1. Natychmiastowa rotacja WSZYSTKICH powyższych sekretów
2. Rozważ `git filter-branch` lub `bfg` do usunięcia `.env` z historii (wymaga force-push)
3. Po rotacji, sprawdź czy nowe sekrety nie są commitowane

---

### 1.2 ⛔ Brak autoryzacji w publicznych server actions

**Pliki i lokalizacje:**

| Plik | Funkcja | Problem |
|------|---------|---------|
| `actions/seo.ts:6` | `getSeoSettings()` | Brak `verifySession()` — zwraca SEO config wszystkich stron |
| `actions/seo.ts:20` | `getGlobalSeo()` | Brak auth — zwraca globalne SEO w tym `customHeadTags` |
| `actions/seo.ts:82` | `getLlmsTxtContent()` | Brak auth — zwraca treść llms.txt |
| `actions/pages.ts:65` | `getPageTree()` | Brak auth — zwraca pełne drzewo stron z ID |
| `actions/pages.ts:83` | `getSectionsForGraph()` | Brak auth — zwraca listę sekcji |
| `actions/pages.ts:90` | `getPageFlat()` | Brak auth — zwraca pełną listę stron |
| `actions/content.ts:20` | `getContentBySlug()` | Brak auth — zwraca również ukryte/draftowe sekcje (`isVisible: false`) |

**Ryzyko:** Server actions można wywoływać bezpośrednio przez POST. Atakujący poznaje wewnętrzną strukturę serwisu, ID encji, ukrytą treść i konfigurację.

**Rozwiązanie:** Dodać `verifySession()` do każdej funkcji adminowej LUB, jeśli mają być publiczne, filtrować `isVisible: true` w `getContentBySlug`.

---

### 1.3 ⛔ XSS w szablonie testowego emaila (mailing.ts)

**Plik:** `actions/mailing.ts:70-72`

```ts
const logoHtml = logoUrl
  ? `<img src="${logoUrl}" alt="HOMMM" ...`
  : '';
```

`logoUrl` z bazy wstawiany jest do HTML bez escapowania. Porównaj z `lib/mail.ts:72`, gdzie poprawnie używa `escapeAttr()`. Admin z dostępem do edycji logo mailingowego może wstrzyknąć HTML/JS do emaili.

**Rozwiązanie:** Użyć `escapeAttr()` z `lib/mail.ts` lub wyodrębnić layout emaila do wspólnej funkcji.

---

### 1.4 ⛔ Niekompletna ochrona SSRF w iCal sync

**Plik:** `actions/ical.ts:18-26, 93-100`

Problemy:
1. **`addICalFeed`** — brak walidacji URL przy zapisie (żaden string jest akceptowany)
2. **`syncICalFeed`** — blocklista hostów jest niekompletna:
   - Brakuje: octal IP (`0177.0.0.1`), decimal IP (`2130706433`), IPv6 link-local (`fe80::`), RFC-1918 (`10.x`, `192.168.x`, `172.16-31.x`), AWS/GCP internal (`100.64.0.0/10`)
   - Walidacja odbywa się dopiero przy sync, nie przy zapisie

**Rozwiązanie:** Walidować URL przy `addICalFeed` (wymuszać `https://`, sprawdzać host). Rozszerzyć blocklist lub użyć podejścia allowlist (tylko znane domeny iCal: google, airbnb itp.).

---

## 2. WAŻNE — Bezpieczeństwo i logika

### 2.1 Rate limiter in-memory — nieskuteczny na Vercel

**Plik:** `lib/rate-limit.ts`

Rate limiter oparty na `Map` w pamięci. Na Vercel każda instancja Serverless Function ma osobny `Map`, więc efektywny limit = `MAX_REQUESTS × liczba instancji`. Dla logowania (10 prób/15 min) i rezerwacji (5/min) ochrona jest iluzoryczna.

**Rozwiązanie:** Upstash Rate Limit (`@upstash/ratelimit`) lub Vercel WAF rate limiting.

### 2.2 IP spoofing przez X-Forwarded-For

**Pliki:** `app/api/reservations/route.ts:18`, `app/api/auth/login/route.ts:12`

```ts
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
```

`X-Forwarded-For[0]` to wartość kontrolowana przez klienta. Atakujący może wysłać dowolne IP i obejść rate limiting. Na Vercel, bezpieczniejsze jest użycie **ostatniego** elementu (dodanego przez platformę) lub nagłówka `x-real-ip` z Vercel.

### 2.3 Brak walidacji Zod w `updateReservation`

**Plik:** `actions/reservations.ts:138-175`

Funkcja przyjmuje `totalPrice?: number` bez walidacji. Server actions nie enforcują typów TypeScript w runtime — można przekazać `NaN`, `Infinity`, liczbę ujemną. Porównaj z `updateClient` (linia 162) która poprawnie używa Zod schema.

**Dodatkowy problem (linia 148-149):** `new Date(data.checkIn)` bez sprawdzenia `isNaN()` — niepoprawny string daty przejdzie walidację `checkOut <= checkIn` (NaN comparisons zwracają false).

### 2.4 Duplikaty w `addBlockedDate`

**Plik:** `actions/reservations.ts:231-252`

Brak sprawdzenia unikalności daty przed `prisma.blockedDate.create()`. Wielokrotne wywołanie z tą samą datą tworzy duplikaty. Porównaj z iCal sync (`ical.ts:138`) który używa `skipDuplicates: true`.

### 2.5 Brak walidacji `status` w eksporcie CSV

**Plik:** `app/api/admin/reservations/export/route.ts:28`

Parametr `status` z query string trafia do Prisma bez walidacji przez enum. Prisma odrzuci niepoprawną wartość, ale error handling jest ogólny.

### 2.6 `updateGlobalSeo` i `updateLlmsTxt` — niepotrzebne `JSON.parse(JSON.stringify())`

**Plik:** `actions/seo.ts:50, 94`

```ts
const jsonValue = JSON.parse(JSON.stringify(data));
```

To no-op dla prostych obiektów. Jeśli celem jest deep clone — `structuredClone(data)` jest czytelniejszy. Jeśli celem jest usunięcie `undefined` — lepiej zrobić to jawnie.

---

## 3. WYDAJNOŚĆ — Optymalizacje

### 3.1 `getClients` — pobieranie WSZYSTKICH klientów z rezerwacjami dla computed sort

**Plik:** `actions/clients.ts:58-66`

```ts
const needsComputedSort = sortBy === 'reservationCount' || sortBy === 'totalSpent';
// ... pobiera WSZYSTKICH klientów bez paginacji gdy needsComputedSort
```

Gdy sortowanie po `reservationCount` lub `totalSpent`, pobierani są WSZYSCY klienci z relacją `reservations` — paginacja jest nakładana dopiero w JS. Przy dużej liczbie klientów to problem wydajnościowy i pamięciowy.

**Rozwiązanie:** Użyć raw SQL z `GROUP BY` i `ORDER BY` w Prisma `$queryRaw` lub dedykowanego widoku SQL.

### 3.2 `getSettings` — osobne zapytanie dla każdego klucza settings

**Plik:** `actions/settings.ts:80`

`getSettings()` pobiera wszystkie wpisy `siteSettings` w jednym zapytaniu — to poprawne. Jest owinięte `cache()` z React — dobrze. Ale `updateSettings` (linia 124) robi `upsert` w transakcji dla KAŻDEGO klucza osobno. Przy 18 kluczach to 18 operacji DB.

**Rozwiązanie:** Użyć pojedynczego JSON-a w jednym wierszu `siteSettings` zamiast wielu wierszy.

### 3.3 `getYearlyReport` — iteracja O(n²)

**Plik:** `actions/reports.ts:94-106`

Dla każdego z 12 miesięcy iteruje po WSZYSTKICH potwierdzonych rezerwacjach:
```ts
const monthlyRevenue = MONTH_NAMES.map((name, i) => {
  for (const r of confirmed) { // n rezerwacji × 12 miesięcy
```

Przy 500+ rezerwacjach to 6000+ iteracji `overlapNights`. Nie jest to problem przy obecnej skali, ale liniowo rośnie.

### 3.4 `updateImageOrder` — N operacji UPDATE w transakcji

**Plik:** `actions/gallery.ts:83-94`

```ts
await prisma.$transaction(
  ids.map((id, index) =>
    prisma.galleryImage.update({ where: { id }, data: { order: index } }),
  ),
);
```

Przy 50+ obrazach to 50+ UPDATEów. Można zoptymalizować do jednego `$executeRaw` z CASE/WHEN.

### 3.5 `updateSettings` — 18 UPSERTów w transakcji

**Plik:** `actions/settings.ts:124`

Analogicznie do 3.4 — każdy klucz ustawień to osobny upsert.

### 3.6 `gal_00.webp` w public/ — 1.4 MB

**Plik:** `public/assets/gal_00.webp` (1.4 MB)

Jest to bardzo duży plik jak na WebP. Sugerowane jest przejrzenie i rekompresja (typowy WebP tego rozmiaru powinien być < 300 KB).

### 3.7 `logo.png` — jedyny plik PNG, nie zoptymalizowany

**Plik:** `public/assets/logo.png` (74 KB)

Jedyny plik PNG w katalogu `public/`. Może być skonwertowany do WebP/AVIF (lub SVG jeśli to logo wektorowe) dla spójności i mniejszego rozmiaru.

### 3.8 TypeKit CSS — redundantny preload, render-blocking

**Plik:** `app/layout.tsx:86-90`

```html
<link rel="preload" href="https://use.typekit.net/zpt0osi.css" as="style" />
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
```

Synchroniczny `<link rel="stylesheet">` blokuje renderowanie strony. `<link rel="preload">` tuż nad nim jest redundantny — nie daje żadnego przyspieszenia. Komentarz w kodzie mówi "async load to avoid render-blocking", ale implementacja tego nie zapewnia.

**Rozwiązanie:** Zastąpić wzorcem `media="print" onload="this.media='all'"` lub użyć `next/font` z Google Fonts API dla TypeKit.

### 3.9 Dashboard — sekwencyjne zapytania poza Promise.all

**Plik:** `app/admin/dashboard/page.tsx:221-264`

Po głównym `Promise.all` z 9 zapytaniami (dobrze), wykonywane są 3 dodatkowe zapytania **sekwencyjnie** (`upcomingCheckIns`, `pendingCheckingSoon`, `depositSoon`), mimo że nie zależą od wyników głównej paczki.

**Rozwiązanie:** Włączyć do głównego `Promise.all`.

### 3.10 `react-datepicker` statycznie w bundlu głównym

**Plik:** `components/HomeClient.tsx:11`

```ts
import DatePicker from 'react-datepicker'; // zawsze w bundlu
const Lightbox = dynamic(...)              // lazy — dobrze
```

`react-datepicker` jest importowany statycznie, podczas gdy `Lightbox` jest poprawnie lazy-loaded. DatePicker jest potrzebny tylko w widoku `rezerwuj`/`miejsca`, ale trafia do głównego bundla klienta.

**Rozwiązanie:** `dynamic(() => import('react-datepicker'), { ssr: false })` lub warunkowy render.

### 3.11 `sanitizeHtml` wywoływane przy każdym renderze bez memoizacji

**Plik:** `components/HomeClient.tsx:560, 589, 593, 669-671, 728, 759`

`sanitize-html` parsuje HTML przez parser DOM-like — ciężka operacja. Jest wywoływane inline przy każdym renderze komponentu (kilkukrotnie), bez `useMemo`. Scroll events powodują częste re-rendery.

### 3.12 `setHasScrolled` bezwarunkowo przy każdym scroll event

**Plik:** `components/HomeClient.tsx:278`

```ts
setHasScrolled(currentScrollY > SCROLL_COMPACT_THRESHOLD); // zawsze setState
```

Wywoływane przy każdym scroll event (nawet gdy wartość się nie zmienia), co powoduje re-render `HomeClient` i całej jego zawartości.

**Rozwiązanie:** Sprawdzenie czy wartość się zmieniła przed wywołaniem setState.

### 3.13 AdminShell — 3 fetch requests na każde mount bez cache

**Plik:** `components/admin/AdminShell.tsx`

Sidebar ładuje `/api/content/sections`, `/api/admin/build-info` i `/api/admin/notifications` przy każdej nawigacji w panelu admina (re-mount). Wyniki nie są cachowane.

### 3.14 `react.cache` w Server Action — nie deduplikuje

**Plik:** `actions/settings.ts:80`

```ts
export const getSettings = cache(async (): Promise<SiteSettingsMap> => { ... });
```

`cache()` z React jest przeznaczone do Server Components (deduplikacja w jednym render tree). Server Actions (`'use server'`) są wywoływane w osobnym request — `cache()` nie deduplikuje między invocations.

---

## 4. OPTYMALIZACJA GRAFIK

### 4.1 Pipeline optymalizacji obrazów (gallery) — POPRAWNY ✅

**Plik:** `actions/gallery.ts:35-48`

Pipeline sharp jest dobrze zaimplementowany:
- ✅ 4 warianty równolegle: original (95%), standard (82%), mobile (800px, 80%), thumbnail (400px, 82%)
- ✅ Wszystko konwertowane do WebP
- ✅ `withoutEnlargement: true` — nie powiększa mniejszych obrazów
- ✅ Równoległy upload do Blob (`Promise.all`)
- ✅ Walidacja typu pliku (`ALLOWED_TYPES`) i rozmiaru (`10 MB`)

### 4.2 Next.js Image Optimization — POPRAWNA ✅

**Plik:** `next.config.ts:48-62`

- ✅ Formaty: `['image/avif', 'image/webp']` — AVIF jako preferowany
- ✅ `deviceSizes` i `imageSizes` skonfigurowane
- ✅ `remotePatterns` dla Vercel Blob

### 4.3 Użycie `next/image` — CZĘŚCIOWE ⚠️

**W kodzie:**
- ✅ `Image` z next/image używany w `HomeClient.tsx` (galeria, baner)
- ✅ `Image` w `[...slug]/page.tsx` (podstrony)
- ❌ **Tła 4 sekcji przez CSS `background-image`** — omijają `next/image` (patrz sekcja 0.1)
- ⚠️ `<img src="/assets/hommm.svg">` w hero sekcji (`HomeClient.tsx:706`) — SVG, OK dla tego formatu
- ⚠️ `<img src="/assets/hommm.svg">` w footer (`HomeClient.tsx:789`) — brak `next/image` (dla SVG akceptowalne)

### 4.4 Pliki statyczne w `public/` — podsumowanie rozmiarów

| Plik | Rozmiar | Format | Używany przez | Responsive mobile? | Uwaga |
|------|---------|--------|---------------|-------------------|-------|
| `gal_00.webp` | 1.4 MB | WebP | `<Image>` | ✅ 640px via sizes | **Za duży** — wymaga rekompresji |
| `hero.webp` | 452 KB | WebP | CSS `background-image` | ❌ pełny 1920px | **Tło sekcji — omija next/image** |
| `sec_3.webp` | 448 KB | WebP | CSS `background-image` | ❌ pełny 1920px | **Tło sekcji — omija next/image** |
| `sec_2.webp` | 364 KB | WebP | CSS `background-image` | ❌ pełny 1920px | **Tło sekcji — omija next/image** |
| `gal_01.webp` | 336 KB | WebP | `<Image>` | ✅ 640px via sizes | OK |
| `footer.webp` | 156 KB | WebP | CSS `background-image` | ❌ pełny 1920px | **Tło sekcji — omija next/image** |
| `gal_02.webp` | 116 KB | WebP | `<Image>` | ✅ 640px via sizes | OK |
| `logo.png` | 74 KB | PNG | bezpośrednio | — | Konwertować do WebP/SVG |
| `hommm.svg` | 68 KB | SVG | `<img>` | — | OK (logo wektorowe) |
| `mailing_logo.webp` | 16 KB | WebP | email | — | OK |
| `baner.webp` | 15 KB | WebP | `<Image>` | ✅ | OK |
| `cfab_logo_2026.svg` | 11 KB | SVG | `<img>` | — | OK |

**Kluczowy wniosek:** 4 największe pliki graficzne (hero, sec_2, sec_3, footer = łącznie 1.42 MB) są serwowane jako CSS `background-image` — identyczny plik na mobile i desktop, bez AVIF, bez responsywnych rozmiarów. To główna przyczyna niskiego PageSpeed mobile.

---

## 5. JAKOŚĆ KODU — Duplikacje i wzorce

### 5.1 Zduplikowany layout emaila

**Pliki:** `lib/mail.ts:70-86` vs `actions/mailing.ts:74-85`

Funkcja `emailLayout()` z `lib/mail.ts` jest skopiowana (z pominięciem `escapeAttr`) do `actions/mailing.ts:sendTestEmail`. To powoduje:
1. Bug bezpieczeństwa (brak escapowania — patrz 1.3)
2. Rozsynchronizowanie zmian wizualnych (zmiana w jednym miejscu nie aktualizuje drugiego)

**Rozwiązanie:** Wyeksportować `emailLayout()` z `lib/mail.ts` i użyć w obu miejscach.

### 5.2 Powtórzony wzorzec `unauthorized()`

**Pliki:** `actions/reservations.ts:15`, `actions/clients.ts:8`, `actions/reports.ts:7`, `actions/ical.ts:7`

Identyczna funkcja `function unauthorized() { return { error: 'Brak autoryzacji' }; }` zdefiniowana w 4 plikach.

**Rozwiązanie:** Wyeksportować z jednego pliku (np. `lib/auth.ts`).

### 5.3 Powtórzony wzorzec konwersji dat w akcjach

**Pliki:** `actions/reservations.ts:62-68, 82-89, 187-191`

Wzorzec `{ ...r, checkIn: r.checkIn.toISOString(), ... }` powtarza się w 3 funkcjach. Może być helper `serializeReservation(r)`.

### 5.4 `STATUS_LABELS` zduplikowane

**Pliki:** `app/api/admin/reservations/export/route.ts:6-12` vs `lib/reservation-status.ts:10-41`

`STATUS_LABELS` w route eksportowym są ręcznie zdefiniowane, gdy `STATUS_CONFIG` w `lib/reservation-status.ts` zawiera te same dane (pole `label`).

### 5.5 `CONFIRMED_STATUSES` zduplikowane

**Pliki:** `actions/reports.ts:12`, `actions/clients.ts:76-77`, `app/admin/dashboard/page.tsx:21`

Tablica `['DEPOSIT_PAID', 'PAID', 'COMPLETED']` powtarza się w 3+ plikach jako literał.

### 5.6 `formatPLN` zduplikowane

**Pliki:** `lib/format.ts:1-3` vs `app/admin/dashboard/page.tsx:294-296`

Identyczna funkcja `formatPLN` zdefiniowana w obu plikach. Dashboard nie importuje z `lib/format.ts`.

### 5.7 `getWeekOfYear` w dashboard — mogłaby być w `lib/date-utils.ts`

**Plik:** `app/admin/dashboard/page.tsx:13-17`

Lokalna funkcja `getWeekOfYear` zdefiniowana w pliku dashboard. Jeśli będzie potrzebna gdzie indziej, wymaga duplikacji.

### 5.8 Trzecia kopia layoutu emaila — `MailingEditor.tsx`

**Pliki:** `lib/mail.ts:70-86` vs `actions/mailing.ts:73-85` vs `app/admin/mailing/MailingEditor.tsx:42-58`

Funkcja `buildPreviewHtml()` w `MailingEditor.tsx` to trzecia kopia tego samego HTML emaila. Łącznie 3 miejsca z identyczną strukturą `<!doctype html>...<h1 style="color:#be1622;">HOMMM</h1>...footer`. Każda zmiana wizualna wymaga edycji 3 plików.

### 5.9 `SAMPLE_VARS` zduplikowane

**Pliki:** `actions/mailing.ts:46-56` vs `app/admin/mailing/MailingEditor.tsx:30-40`

Identyczny obiekt z 9 kluczami (`guestName`, `checkIn`, `checkOut`, ...) i tymi samymi wartościami przykładowymi, zdefiniowany w dwóch plikach. Powinien być w jednym miejscu (np. `lib/email-template-defaults.ts`).

### 5.10 `STATUS_COLORS` w CalendarView — duplikuje `STATUS_CONFIG.color`

**Pliki:** `app/admin/calendar/CalendarView.tsx:47-52` vs `lib/reservation-status.ts:10-41`

Lokalna mapa `STATUS_COLORS` (klasy Tailwind border) jest koncepcyjnie tą samą mapą co `STATUS_CONFIG.color`/`badgeClass`. Kolory powinny być scentralizowane w `lib/reservation-status.ts`.

### 5.11 `MONTH_NAMES` zduplikowane

**Pliki:** `actions/reports.ts:92` vs `app/admin/dashboard/page.tsx:11`

Identyczna tablica `['Sty', 'Lut', 'Mar', ...]` zdefiniowana w dwóch plikach.

### 5.12 Zduplikowany parser tagów JSON

**Pliki:** `app/admin/clients/ClientsClient.tsx:102-104, 147-149` vs `app/admin/clients/[id]/ClientDetail.tsx:50`

`try { JSON.parse(c.tags) } catch { return [] }` powtórzony 3 razy. W `ClientsClient.tsx` wywołany dwukrotnie (desktop i mobile). Helper `parseTags(json: string): string[]` wyeliminowałby duplikację.

### 5.13 Zduplikowany wzorzec debounce szukania

**Pliki:** `app/admin/reservations/ReservationsClient.tsx:96-101` vs `app/admin/clients/ClientsClient.tsx:52-55`

Identyczny `useEffect` z `setTimeout(400)` i parą stanów `search`/`searchInput`. Kandydat do hooka `useDebounce(value, delay)`.

### 5.14 Zduplikowany blok paginacji JSX

**Pliki:** `app/admin/reservations/ReservationsClient.tsx:319-343` vs `app/admin/clients/ClientsClient.tsx:191-198`

Identyczny układ: stan `page`/`pages`, text "Strona X z Y", przyciski Poprzednia/Następna z `disabled`. Kandydat do wspólnego komponentu `<Pagination>`.

### 5.15 Stringly-typed statusy rezerwacji zamiast stałych

**Pliki:** `actions/reservations.ts:107-108`, `app/admin/dashboard/page.tsx:148,179`, `app/admin/calendar/CalendarView.tsx:47-52`

Literalne stringi statusów (`'PAID'`, `'COMPLETED'`, `'DEPOSIT_PAID'`) używane inline w wielu plikach zamiast reużycia `ReservationStatusKey` i stałych z `lib/reservation-status.ts`.

### 5.16 Zduplikowana logika budowania `where` rezerwacji

**Pliki:** `actions/reservations.ts:38-45` vs `app/api/admin/reservations/export/route.ts:32-38`

Identyczna struktura `where.OR` z `guestName`, `guestEmail`, `guestPhone` i `mode: 'insensitive'`. Mogłaby być wyodrębniona do `buildReservationWhereClause()`.

### 5.17 Obliczanie nocy — dwa różne sposoby

**Pliki:** `actions/reservations.ts:153` vs `app/admin/calendar/CalendarView.tsx:233,306`

`Math.round((checkOut - checkIn) / ms_per_day)` w actions vs `differenceInCalendarDays` z `date-fns` w kalendarzu. `date-fns` jest importowane w obu plikach — powinno być użyte konsekwentnie.

---

## 6. DROBNE UWAGI

### 6.1 Nagłówki bezpieczeństwa — DOBRZE SKONFIGUROWANE ✅

**Plik:** `next.config.ts:8-45`

- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `Strict-Transport-Security` z preload
- ✅ `Content-Security-Policy` z dozwolonymi źródłami
- ✅ `Permissions-Policy` — blokuje kamerę, mikrofon, geolokalizację

### 6.2 CSP ma `unsafe-eval` i `unsafe-inline`

**Plik:** `next.config.ts:37`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

`unsafe-eval` i `unsafe-inline` osłabiają CSP. Jest to typowe dla Next.js (szczególnie w dev), ale w produkcji warto rozważyć nonce-based CSP.

### 6.3 Middleware — POPRAWNY ✅

**Plik:** `middleware.ts`

- ✅ JWT weryfikowany w middleware (szybkie odrzucenie nieautoryzowanych)
- ✅ Cookie usuwane przy błędzie weryfikacji
- ✅ Login page wyłączona z ochrony
- ✅ Matcher ogranicza uruchamianie middleware

### 6.4 Auth system — DOBRZE ZAPROJEKTOWANY ✅

**Plik:** `lib/auth.ts`

- ✅ Dwupoziomowy system: JWT (24h) + sesja DB (7 dni)
- ✅ Automatyczne odświeżanie JWT gdy wygaśnie (ale sesja DB wciąż ważna)
- ✅ Czyszczenie wygasłych sesji przy tworzeniu nowej
- ✅ Sprawdzanie `isActive` admina
- ✅ Cookie: httpOnly, secure w prod, sameSite lax

### 6.5 Login — DOBRZE ZABEZPIECZONY ✅

**Plik:** `app/api/auth/login/route.ts`

- ✅ Timing attack mitigation (`setTimeout 500ms` przy błędnym kodzie)
- ✅ Rate limiting (10/15 min)
- ✅ Jednolity komunikat błędu (nie ujawnia czy email czy kod jest błędny)
- ✅ Walidacja Zod na wejściu

### 6.6 Sanityzacja HTML — POPRAWNA ✅

**Plik:** `lib/sanitize.ts`

- ✅ Whitelist tagów i atrybutów
- ✅ Auto-dodawanie `rel="noopener noreferrer"` do linków `_blank`
- ✅ Używana konsekwentnie w `dangerouslySetInnerHTML`

### 6.7 Upload obrazów — BEZPIECZNY ✅

**Plik:** `actions/gallery.ts:18-62`

- ✅ Walidacja typu MIME (whitelist)
- ✅ Walidacja rozmiaru (10 MB max)
- ✅ Losowa nazwa pliku (`crypto.randomBytes`)
- ✅ Przekazanie przez `sharp` (przeparsowanie — eliminuje payload w metadanych)
- ✅ Autoryzacja sesji

### 6.8 Cron job — POPRAWNY ✅

**Pliki:** `vercel.json:8-13`, `app/api/cron/export/route.ts`

- ✅ Weryfikacja `CRON_SECRET`
- ✅ Truncation danych JSON (50K) w emailu
- ✅ Escapowanie HTML w eksporcie JSON

### 6.9 Prisma singleton — POPRAWNY ✅

**Plik:** `lib/db.ts`

- ✅ Global singleton pattern
- ✅ Przypisanie do `globalThis` tylko w development (zapobiega wyciekowi w hot reload)
- ✅ Adapter Neon poprawnie skonfigurowany

### 6.10 Transakcja rezerwacji — POPRAWNA ✅

**Plik:** `app/api/reservations/route.ts:63-110`

- ✅ `isolationLevel: 'Serializable'` — zapobiega race conditions
- ✅ Sprawdzanie nakładających się rezerwacji i zablokowanych dat w transakcji
- ✅ Upsert klienta
- ✅ Emaile fire & forget (nie blokują odpowiedzi)

### 6.11 Env validation — DOBRZE ✅

**Plik:** `lib/env.ts`

- ✅ Minimalna długość JWT_SECRET (32 znaki)
- ✅ Minimalna długość ADMIN_SECRET_CODE (12 znaków)
- ✅ Cache na poziomie modułu (enkodowanie raz)
- ✅ Fail-fast przy brakujących env

### 6.12 Schema Prisma — indeksy OK ✅

**Plik:** `prisma/schema.prisma`

Indeksy są na kluczowych kolumnach:
- ✅ `Reservation: @@index([checkIn, checkOut])` — zapytania o dostępność
- ✅ `Reservation: @@index([status])` — filtrowanie po statusie
- ✅ `Reservation: @@index([clientId])` — relacja klient-rezerwacja
- ✅ `Session: @@index([expiresAt])` — czyszczenie wygasłych sesji
- ✅ `BlockedDate: @@index([date])` — zapytania o zablokowane daty
- ✅ `GalleryImage: @@index([sectionId])` — galeria sekcji

### 6.13 Brak indeksu na `BlockedDate` — unikalność daty

**Plik:** `prisma/schema.prisma:133-141`

Nie ma `@@unique([date])` ani `@@unique([date, type])` na `BlockedDate`, co pozwala na duplikaty (patrz 2.4).

---

## 7. PODSUMOWANIE

### Co działa dobrze ✅

- **Architektura auth** — dwupoziomowy JWT + sesja DB, bezpieczne cookie
- **Pipeline upload grafik** — sharp z 4 wariantami, równoległa konwersja i upload
- **Sanityzacja HTML** — konsekwentne użycie `sanitize-html` z whitelistą
- **Transakcyjność rezerwacji** — Serializable isolation level
- **Nagłówki bezpieczeństwa** — CSP, HSTS, X-Frame-Options
- **Walidacja wejścia** — Zod schemas dla kluczowych endpointów
- **Indeksy DB** — poprawne na głównych kolumnach
- **Image optimization** — AVIF/WebP, responsive sizes, preload LCP

### Co wymaga natychmiastowej naprawy ⛔

| # | Problem | Priorytet |
|---|---------|-----------|
| 1.1 | Rotacja WSZYSTKICH sekretów (były w git history) | **P0** |
| 1.2 | Dodać auth do 7 niezabezpieczonych server actions | **P0** |
| 1.3 | Escapowanie logoUrl w mailing.ts | **P1** |
| 1.4 | Walidacja URL w addICalFeed + rozszerzenie SSRF blocklist | **P1** |
| 2.1 | Migracja rate limitera na Upstash | **P2** |
| 2.3 | Dodać walidację Zod w updateReservation | **P2** |

### Kluczowe naprawy PageSpeed (sekcja 0) ⚡

| # | Naprawa | Wpływ na PageSpeed mobile |
|---|---------|--------------------------|
| 0.1 | **Tła sekcji → `<Image fill>` z `sizes`** (hero, sec_2, sec_3, footer) | **LCP -2 do -4s** (najważniejsza zmiana!) |
| 0.2 | **TypeKit CSS → async load** (`media="print" onLoad`) | **FCP -0.5 do -0.7s** |
| 0.3 | **Lazy import react-datepicker** (`dynamic()`) | TBT -50-100ms |
| 0.4 | **Rekompresja gal_00.webp** (1.4 MB → ~250 KB) | LCP -0.3 do -1s (gdy widoczny) |
| 0.5 | **Preconnect do Blob Storage** | LCP -0.1 do -0.2s |
| 0.6 | **Konwersja logo.png do WebP** (74 KB → ~20 KB) | marginalne |

### Sugerowane optymalizacje kodu 📈

| # | Optymalizacja | Wpływ |
|---|---------------|-------|
| 3.1 | SQL-owy sort klientów zamiast JS | Wydajność przy >100 klientów |
| 3.9 | Dashboard zapytania do Promise.all | Szybszy czas ładowania admina |
| 3.11 | useMemo na sanitizeHtml | Mniej CPU na re-renderach |
| 3.12 | Guard na setHasScrolled | Eliminacja zbędnych re-renderów |
| 5.1+5.8 | Wyekstrahowanie wspólnego emailLayout (3 kopie!) | Eliminacja duplikacji i buga XSS |
| 5.2 | Wspólna funkcja unauthorized() | Czystość kodu |
| 5.5 | Stała CONFIRMED_STATUSES w jednym miejscu | Eliminacja duplikacji |
| 5.6 | Import formatPLN z lib/format.ts | Eliminacja duplikacji |
| 5.9 | SAMPLE_VARS do wspólnego pliku | Eliminacja duplikacji |
| 5.13 | Hook useDebounce | Eliminacja powtarzającego się wzorca |
| 5.14 | Komponent \<Pagination\> | Eliminacja duplikacji JSX |
| 5.15 | Stałe statusów zamiast literalnych stringów | Spójność, bezpieczeństwo typów |

### Statystyki audytu

| Metryka | Wartość |
|---------|--------|
| Plików źródłowych przeanalizowanych | ~80 |
| Znalezisk KRYTYCZNYCH | 4 |
| Znalezisk WAŻNYCH | 6 |
| Znalezisk wydajnościowych | 14 |
| Duplikacji kodu | 17 |
| Elementów poprawnych (✅) | 13 |

---

*Raport wygenerowany 2026-03-28 na podstawie pełnej analizy kodu źródłowego projektu HOMMM.*
