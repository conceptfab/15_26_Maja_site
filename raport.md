# Raport audytu kodu — HOMMM

**Data:** 2026-03-28 (aktualizacja po wcześniejszych naprawach)
**Projekt:** HOMMM — system rezerwacji i strona internetowa
**Stack:** Next.js 15.2.4 + React 19 + Prisma 7.5 + Neon PostgreSQL + Vercel Blob + Nodemailer

---

## Spis treści

1. [Podsumowanie](#1-podsumowanie)
2. [Bezpieczeństwo](#2-bezpieczeństwo)
3. [Logika i poprawność](#3-logika-i-poprawność)
4. [Wydajność](#4-wydajność)
5. [Optymalizacja obrazów i plików](#5-optymalizacja-obrazów-i-plików)
6. [Nadmiarowy kod](#6-nadmiarowy-kod)
7. [Baza danych](#7-baza-danych)
8. [Architektura i jakość kodu](#8-architektura-i-jakość-kodu)
9. [Sugerowane poprawki — priorytetyzacja](#9-sugerowane-poprawki--priorytetyzacja)
10. [Historia napraw (wcześniejsze rundy)](#10-historia-napraw)

---

## 1. Podsumowanie

Aplikacja przeszła już wcześniejszy audyt i 3 rundy napraw (20 problemów naprawionych). Obecny przegląd weryfikuje stan po naprawach i identyfikuje nowe/pozostałe problemy.

**Ocena ogólna: 8/10** — solidna baza, dobrze zabezpieczona, kilka miejsc do poprawy w zakresie wydajności i optymalizacji.

### Statystyki

| Metryka | Wartość |
|---------|---------|
| Pliki źródłowe (TS/TSX) | ~80 |
| Modele DB | 12 |
| API Routes | 14 |
| Server Actions | 10 plików, ~50 funkcji |
| Statyczne assety | 12 plików, ~3.4 MB |
| Zależności produkcyjne | ~30 |

### Co działa dobrze

- Sanityzacja HTML (allowlist-based) + escape w szablonach emaili
- Dwuwarstwowa autoryzacja (JWT 24h + sesja DB 7 dni) z auto-refresh
- Transakcje Serializable na tworzeniu rezerwacji (race condition prevention)
- Pipeline przetwarzania obrazów: 4 warianty, równoległa konwersja sharp, równoległy upload Blob
- Formaty obrazów: AVIF + WebP w konfiguracji Next.js
- ISR na stronie głównej (revalidate = 60)
- Rate limiting na rezerwacjach (5 req/min per IP)
- Pliki .env nie są w git
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy)
- Spójny wzorzec autoryzacji we wszystkich Server Actions admin

---

## 2. Bezpieczeństwo

### 2.1 Middleware nie chroni `/api/admin/*` (HIGH)

**Plik:** `middleware.ts:38-40`

Matcher pokrywa tylko `/admin/:path*` (strony HTML). Ścieżki `/api/admin/*` (np. `/api/admin/reservations/export`, `/api/admin/notifications`, `/api/admin/build-info`) **nie są objęte matcherem**. Te route handlery wywołują `verifySession()` wewnętrznie — ale to jedyna linia obrony. Jeśli ktoś doda nowy route handler bez `verifySession()`, nie będzie żadnego sygnału.

**Rekomendacja:**
```ts
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

### 2.2 Brak rate limitingu na endpointach auth (HIGH)

**Plik:** `app/api/auth/login/route.ts`

Endpoint logowania nie posiada rate limitingu. Choć `ADMIN_SECRET_CODE` wymaga 12+ znaków, brak limitu prób pozwala na nieograniczony brute-force. Rate limiter istnieje już w projekcie (`lib/rate-limit.ts`).

**Rekomendacja:** Dodać `checkRateLimit(ip)` z limitem 5-10 prób / 15 min per IP. Opcjonalnie: sztuczne opóźnienie 500ms po błędnym kodzie.

### 2.3 JWT refresh akceptuje dowolny błąd, nie tylko wygaśnięcie (MEDIUM)

**Plik:** `lib/auth.ts:47-52`

```ts
try {
  await jwtVerify(token, getJwtSecret());
} catch {
  jwtExpired = true; // łapie WSZYSTKIE błędy, nie tylko wygaśnięcie
}
```

Catch łapie wszystkie wyjątki z `jwtVerify`, w tym błąd podpisu (`JWSSignatureVerificationFailed`). Jeśli atakujący ma token z prawidłowym `adminId` ale sfabrykowanym podpisem, a ten token przypadkowo istnieje w tabeli `Session` — przejdzie weryfikację DB i dostanie nowy podpisany token.

**Rekomendacja:**
```ts
import { errors } from 'jose';
try {
  await jwtVerify(token, getJwtSecret());
} catch (err) {
  if (err instanceof errors.JWTExpired) {
    jwtExpired = true;
  } else {
    return null; // nieprawidłowy podpis — odrzuć
  }
}
```

### 2.4 Rate limiter — fence-post error (LOW)

**Plik:** `lib/rate-limit.ts:38`

```ts
if (entry.count > MAX_REQUESTS) { // pozwala na 6 zamiast 5
```

Warunek `>` zamiast `>=` oznacza, że dozwolone jest `MAX_REQUESTS + 1` żądań (6 zamiast 5).

**Rekomendacja:** Zmienić na `entry.count >= MAX_REQUESTS`.

### 2.5 Rate limiter in-memory — ograniczona skuteczność (LOW-INFO)

**Plik:** `lib/rate-limit.ts`

Rate limiter oparty na `Map` w pamięci. Na Vercel cold starty tworzą nową instancję z pustym `Map`. Komentarz w kodzie prawidłowo dokumentuje ograniczenie. Wystarczające dla małego ruchu, ale nie chroni przed zaawansowanymi atakami.

### 2.6 SSRF w `syncICalFeed` — fetch na dowolny URL z bazy (MEDIUM)

**Plik:** `actions/ical.ts:92-93`

`syncICalFeed` pobiera `feed.url` z bazy i wykonuje na nim bezpośredni `fetch`. Admin może wpisać URL wskazujący na wewnętrzne zasoby infrastruktury (np. `http://169.254.169.254/` na AWS/GCP metadata, `http://localhost/`). Choć wymaga sesji admin, to naruszenie zasady defense-in-depth.

**Rekomendacja:** Walidować URL przed fetch:
```ts
const parsed = new URL(feed.url);
if (parsed.protocol !== 'https:') throw new Error('Tylko HTTPS');
if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) throw new Error('Niedozwolony host');
```

### 2.7 Sanitizer — brak `rel="noopener noreferrer"` dla `target="_blank"` (MEDIUM)

**Plik:** `lib/sanitize.ts:9-11`

Sanitizer zezwala na `<a href="..." target="_blank">` bez wymuszania `rel="noopener noreferrer"`. Strony otwierane przez takie linki mają dostęp do `window.opener` (tab nabbing attack).

**Rekomendacja:** Dodać `transformTags` do konfiguracji sanitize-html:
```ts
transformTags: {
  a: (tagName, attribs) => ({
    tagName,
    attribs: {
      ...attribs,
      ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
    },
  }),
},
```

### 2.7 Middleware nie weryfikuje sesji w DB (LOW)

**Plik:** `middleware.ts`

Middleware sprawdza jedynie podpis JWT (24h), nie waliduje sesji w bazie danych. Po wylogowaniu na innym urządzeniu token jest akceptowany do wygaśnięcia JWT.

**Łagodzenie:** Server Actions wywołują `verifySession()` (sprawdza DB) — dane są chronione. JWT skrócony do 24h — okno ataku jest małe.

### 2.8 Fallback `admin@example.com` może wyciekać dane (LOW)

**Plik:** `lib/env.ts:43`

```ts
return process.env.ADMIN_EMAIL?.trim() || 'admin@example.com';
```

Jeśli `ADMIN_EMAIL` nie jest ustawiony, powiadomienia o rezerwacjach (z danymi osobowymi gości) idą na `admin@example.com` — zewnętrzna domena.

**Rekomendacja:** Rzucać błędem przy braku zmiennej zamiast cichego fallbacku.

### 2.9 Hardcoded Umami website-id w kodzie (MEDIUM)

**Plik:** `app/layout.tsx:92`

```tsx
data-website-id="cf55bcf0-9eb0-474a-8706-159480187605"
```

ID analityki zahardkodowane w kodzie zamiast zmiennej środowiskowej. Narusza zasadę nieumieszczania identyfikatorów infrastruktury w repo.

**Rekomendacja:** Przenieść do `process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID`.

### 2.10 `'use server'` na Route Handler — nieprawidłowa dyrektywa (LOW)

**Plik:** `app/api/admin/reservations/export/route.ts:1`

Dyrektywa `'use server'` nie ma zastosowania do Route Handlerów. Myląca, choć nie powoduje błędu.

### 2.11 Brak Content-Security-Policy (LOW)

### 2.12 Token iCal eksportu w URL (LOW)

### 2.13 Sanityzacja i escape — poprawne (OK)

- `dangerouslySetInnerHTML` używane tylko z `sanitizeHtml()` (w `HomeClient.tsx`)
- `interpolate()` w szablonach emaili — escape HTML
- `escapeAttr()` na logo URL w emailach
- Pliki .env nie są w git

---

## 3. Logika i poprawność

### 3.1 Podwójne zapytanie do DB w `[...slug]/page.tsx` (MEDIUM)

**Plik:** `app/[...slug]/page.tsx`

Funkcje `generateMetadata()` i komponent strony wywołują `getPageBySlug()` osobno — dwa identyczne zapytania do DB per request.

**Rekomendacja:** Użyć React `cache()`:
```ts
import { cache } from 'react';
const getPageBySlug = cache(async (slugSegments: string[]) => { ... });
```

### 3.2 `force-dynamic` na `[...slug]/page.tsx` (MEDIUM)

**Plik:** `app/[...slug]/page.tsx`

Podstrony CMS mają `force-dynamic` — każdy odwiedzający generuje nowe zapytanie DB. Treść CMS zmienia się rzadko.

**Rekomendacja:** Zmienić na `revalidate = 60` (jak strona główna) lub użyć on-demand revalidation po edycji w admin.

### 3.3 `force-dynamic` na robots.ts i sitemap.ts (LOW)

**Pliki:** `app/robots.ts`, `app/sitemap.ts`

Endpointy SEO z `force-dynamic` — SSR na każdym requeście. Treść zmienia się rzadko.

**Rekomendacja:** Zmienić na `revalidate = 3600` (1h).

### 3.4 Walidacja `maxGuests` — niespójna z settings (LOW)

**Plik:** `app/api/reservations/route.ts`

Walidacja Zod pozwala `guests: 1-6` (hardcoded), ale `maxGuests` z ustawień (domyślnie 6) nie jest sprawdzane. Jeśli admin zmieni `maxGuests` na 4, formularz dalej zaakceptuje 6.

**Rekomendacja:** Walidować `guests <= settings.maxGuests` w endpoincie POST po pobraniu settings.

### 3.5 `minNightsWeekend` — ustawienie nigdzie nie jest sprawdzane (LOW)

**Plik:** `actions/settings.ts`

Pole `minNightsWeekend` istnieje w typach, schemacie i UI, ale logika rezerwacji sprawdza tylko `minNights`. Pole jest martwe.

**Rekomendacja:** Zaimplementować walidację weekendowego minimum lub usunąć pole.

### 3.6 iCal sync — N+1 queries (MEDIUM)

**Plik:** `actions/ical.ts:99-124`

Synchronizacja iCal wykonuje `findFirst` + `create` dla każdego dnia każdego eventu, wewnątrz zagnieżdżonych pętli. Przy dużym kalendarzu: setki zapytań.

**Rekomendacja:** Pobrać istniejące `BlockedDate` w zakresie jednym zapytaniem, filtrować w pamięci, użyć `createMany` dla nowych.

### 3.7 Stale closure w `ReservationModal.handleClose` (MEDIUM)

**Plik:** `components/ReservationModal.tsx:56-70`

`resetForm` jest zwykłą funkcją (nie `useCallback`), ale jest wywoływana z `handleClose` opakowaneego w `useCallback([onOpenChange])`. Jeśli `onOpenChange` się nie zmieni, `handleClose` pamięta starą referencję `resetForm`. W praktyce może powodować niepełne czyszczenie formularza przy wielokrotnym otwieraniu/zamykaniu modala.

**Rekomendacja:** Przenieść logikę resetu bezpośrednio do `handleClose`:
```ts
const handleClose = useCallback(() => {
  setFormState('summary');
  setErrorMsg('');
  setTouched({});
  setName(''); setEmail(''); setPhone(''); setComment('');
  setRodo(false);
  onOpenChange(false);
}, [onOpenChange]);
```

### 3.8 Sortowanie klientów po computed fields — działa tylko na bieżącej stronie (MEDIUM)

**Plik:** `actions/clients.ts:46-98`

Gdy `sortBy` to `reservationCount` lub `totalSpent`, Prisma pobiera jedną stronę (`skip`/`take`) i sortuje ją. Klient z wyższymi wydatkami na kolejnej stronie nie pojawi się na właściwej pozycji. Sortowanie po polach wyliczanych nie działa z paginacją.

**Rekomendacja:** Agregować wartości w bazie (raw SQL / view) lub denormalizować kolumny `totalSpent`/`reservationCount` w modelu `Client`.

### 3.9 `syncAllFeeds` sekwencyjny — ryzyko timeout (MEDIUM)

**Plik:** `actions/ical.ts:142-159`

Pętla `for` woła `syncICalFeed` sekwencyjnie. Każdy feed ma timeout 15s. Przy 5 feedach: 75s — przekroczy limit Vercel Functions.

**Rekomendacja:** `Promise.allSettled(feeds.map(f => syncICalFeed(f.id)))`.

### 3.10 Dashboard `allReservations` — brak limitu na zapytaniu (LOW)

**Plik:** `app/admin/dashboard/page.tsx:53-56`

Pobiera wszystkie rezerwacje bez `take`. Przy rosnącej bazie obciąża pamięć przy każdym odświeżeniu dashboardu.

**Rekomendacja:** Dodać filtr czasowy (np. ostatnie 2 lata) lub limit.

### 3.11 Podwójne odczyty `siteSettings` per request (LOW)

**Plik:** `app/layout.tsx:19` + `app/page.tsx:8`

`generateMetadata` w layout.tsx robi `findUnique({ key: 'globalSeo' })`, a `page.tsx` wywołuje `getSettings()` z `findMany()`. Dwa osobne roundtrips do tej samej tabeli per request.

**Rekomendacja:** Użyć `React.cache()` na poziomie zapytania settings.

---

## 4. Wydajność

### 4.1 HomeClient.tsx — monolityczny komponent kliencki (947 linii) (MEDIUM)

**Plik:** `components/HomeClient.tsx`

Cały front strony głównej to jeden komponent `'use client'` (947 linii). Obejmuje system rezerwacji, galerie, animacje scroll, nawigację i stopkę. Cały kod wysyłany do przeglądarki.

**Rekomendacja:**
- Wydzielić `ReservationSystem` jako lazy-loaded komponent
- Stopka (statyczna dane firmy) mogłaby być Server Component
- Lightbox — dynamic import

### 4.2 `react-datepicker` — duży bundle w main chunk (MEDIUM)

Biblioteka `react-datepicker` (~50 KB minified) importowana synchronicznie w `HomeClient.tsx`.

**Rekomendacja:** Dynamic import:
```ts
const DatePicker = dynamic(() => import('react-datepicker'), { ssr: false });
```

### 4.3 `new Date()` przy każdym renderze jako `minDate` (LOW)

**Plik:** `components/HomeClient.tsx:149`

`const today = new Date()` obliczane przy każdym renderze (a `HomeClient` re-renderuje się przy scroll). Używane jako `minDate` w DatePicker — przy zmieniającej się referencji może powodować niepotrzebne re-rendery kalendarza.

**Rekomendacja:** `useMemo(() => new Date(), [])` lub `useRef(new Date())`.

### 4.4 Scroll listener re-rejestrowany przy zmianie `reservationRange` (LOW)

**Plik:** `components/HomeClient.tsx:332`

`reservationRange` w deps `useEffect` powoduje re-rejestrację scroll listenera przy każdej zmianie dat. Wartość jest używana tylko do `reservationRange[0] !== null` — wystarczy ref.

**Rekomendacja:** Użyć `useRef` dla flag `hasReservationDates` zamiast state w deps.

### 4.5 Brak `loading.tsx` w publicznych route'ach (LOW)

Podstrony (`/[...slug]`) i admin nie mają `loading.tsx` — brak streamowania UI, użytkownik widzi pustą stronę do załadowania.

**Rekomendacja:** Dodać `loading.tsx` w `app/admin/` i `app/[...slug]/`.

### 4.4 `getSettings()` — brak cache'owania (LOW)

**Plik:** `actions/settings.ts`

Każde wywołanie `getSettings()` to `findMany` na `SiteSettings`. Na stronie głównej wywoływane per request.

**Rekomendacja:** React `cache()` z TTL ~60s. Ustawienia zmieniają się rzadko.

### 4.5 Statyczne assety — `gal_00.webp` ma 1.4 MB (MEDIUM)

| Plik | Rozmiar |
|------|---------|
| `gal_00.webp` | **1.4 MB** |
| `hero.webp` | 449 KB |
| `sec_3.webp` | 446 KB |
| `sec_2.webp` | 364 KB |
| `gal_01.webp` | 333 KB |
| `footer.webp` | 153 KB |
| `gal_02.webp` | 114 KB |
| `hommm.svg` | 80 KB |
| `logo.png` | 74 KB |

`gal_00.webp` (1.4 MB) to fallback galerii — używany gdy brak zdjęć z DB. Ładowany na frontendzie przez `<Image>` (next/image optymalizuje), ale duży rozmiar spowalnia pierwsze załadowanie.

**Rekomendacja:**
- Zoptymalizować `gal_00.webp` do max ~300 KB (mniejsza rozdzielczość/jakość)
- `hommm.svg` (80 KB) — zoptymalizować przez SVGO (typowo 30-60% redukcji)

---

## 5. Optymalizacja obrazów i plików

### 5.1 Pipeline przetwarzania galerii (OK)

**Plik:** `actions/gallery.ts`

Poprawnie zaprojektowany:
- 4 warianty: original (95% WebP), standard (82%), mobile (800px, 80%), thumbnail (400px, 82%)
- Równoległa konwersja `Promise.all` z sharp
- Równoległy upload do Vercel Blob
- Walidacja: max 10 MB, tylko JPEG/PNG/WebP/AVIF
- Losowe nazwy plików (`crypto.randomBytes`)
- Usuwanie: wszystkie 4 warianty kasowane z Blob

### 5.2 Konfiguracja Next.js Image (OK)

**Plik:** `next.config.ts`

- Remote patterns: Vercel Blob (public + private)
- Formaty: `image/avif`, `image/webp` — poprawna kolejność (avif preferowany)
- Device sizes i image sizes — sensowne

### 5.3 `<img>` zamiast `<Image>` w podstronach CMS (MEDIUM)

**Plik:** `app/[...slug]/page.tsx:98-101`

```tsx
<img src={img.webpUrl} alt={img.altPl || ''} className="..." loading="lazy" />
```

Podstrony CMS używają zwykłego `<img>` zamiast `next/image`. Obrazy z Vercel Blob nie przechodzą przez optymalizację Next.js (brak responsywnych wariantów, brak AVIF negotiation, brak `srcset`).

**Rekomendacja:**
```tsx
import Image from 'next/image';
<Image src={img.webpUrl} alt={img.altPl || ''} width={400} height={300}
       sizes="(max-width:768px) 50vw, 33vw" />
```

### 5.4 Wariant `mobileUrl` — niewykorzystany na frontendzie (LOW)

Pipeline generuje wariant mobilny (800px), ale `HomeClient.tsx` i `[...slug]/page.tsx` używają tylko `webpUrl` lub `thumbUrl`. Wariant `mobileUrl` jest generowany, uploadowany i przechowywany, ale nigdy nie serwowany na stronie publicznej.

**Rekomendacja:** Wykorzystać `mobileSrc` na urządzeniach mobilnych — np. przez `<Image>` z responsive `sizes` lub warunkowo.

### 5.5 `logo.png` — prawdopodobnie nieużywany (LOW)

Plik `public/assets/logo.png` (74 KB) nie jest referencjonowany w kodzie. Aplikacja używa `hommm.svg`.

**Rekomendacja:** Zweryfikować i usunąć jeśli nieużywany.

---

## 6. Nadmiarowy kod

### 6.1 Martwy endpoint `api/uploads/[...path]/route.ts` (LOW)

Endpoint zwraca 404 z komentarzem "pliki są serwowane przez Vercel Blob CDN".

**Rekomendacja:** Usunąć plik.

### 6.2 `minNightsWeekend` — martwe ustawienie (LOW)

Pole istnieje w typach, schemacie, defaults i UI, ale logika biznesowa go nie używa.

**Rekomendacja:** Zaimplementować lub usunąć.

### 6.3 `.astro/` i `dist/` — artefakty z innego frameworka (LOW)

W root projektu istnieją katalogi `.astro/` i `dist/`, pozostałości po wcześniejszym użyciu Astro.

**Rekomendacja:** Dodać do `.gitignore` lub usunąć.

---

## 7. Baza danych

### 7.1 Schema — dobrze zorganizowana (OK)

- Indeksy na kluczowych polach (`checkIn+checkOut`, `status`, `clientId`, `reservationId`, `date`)
- Relacje z `onDelete: Cascade` / `SetNull` — poprawne
- Unikalny index na `[pageId, slug]` w `Section`
- Prisma singleton w `lib/db.ts` — poprawny wzorzec

### 7.2 Brak indeksu na `GalleryImage.sectionId` (LOW)

Zapytania `findMany({ where: { sectionId } })` mogą być wolniejsze przy dużej galerii.

**Rekomendacja:** Dodać `@@index([sectionId])` w modelu `GalleryImage`.

### 7.3 Brak indeksu na `Session.expiresAt` (LOW)

`createSession()` wykonuje `deleteMany({ where: { expiresAt: { lt: new Date() } } })` — skan pełnej tabeli.

**Rekomendacja:** Dodać `@@index([expiresAt])` w modelu `Session`.

### 7.4 `BlockedDate.date` — brak unikatowości (LOW)

Indeks na `date` istnieje, ale nie jest `@unique`. Synchronizacja iCal sprawdza duplikaty ręcznie (`findFirst`), ale panel admin nie zapobiega duplikatom.

**Rekomendacja:** Dodać `@@unique([date])` lub walidację w `addBlockedDate()`.

---

## 8. Architektura i jakość kodu

### 8.1 Separacja server/client (OK)

- Server Components dla stron, Client Components dla interakcji
- `'use client'` tylko tam gdzie potrzebne (17 plików)
- Server Actions z weryfikacją sesji
- Publiczny API Route z transakcją Serializable

### 8.2 Wzorzec autoryzacji — spójny (OK)

Każda Server Action w panelu admin zaczyna od `verifySession()`. Wyjątki to celowe publiczne odczyty (galeria, treści CMS).

### 8.3 Obsługa błędów — konsekwentna (OK)

- Publiczne API: generyczne komunikaty
- Logi: `console.error` z kontekstem
- Emaile: fire-and-forget, nie blokują odpowiedzi
- Fallback content gdy DB niedostępna (build time)

### 8.4 i18n — prosty ale wystarczający (OK)

`I18nProvider` + `useLocale()` z plikami JSON. PL/EN. Treści CMS z osobnymi polami w DB.

### 8.5 Emaile — dobrze zorganizowane (OK)

Szablony edytowalne z admin, fallback do defaults, interpolacja z escape HTML, reusable `loadEmailContext()`.

---

## 9. Sugerowane poprawki — priorytetyzacja

### Priorytet WYSOKI

| # | Problem | Plik | Kategoria |
|---|---------|------|-----------|
| 1 | Middleware nie chroni `/api/admin/*` | `middleware.ts` | Bezpieczeństwo |
| 2 | Rate limiting na login | `app/api/auth/login/route.ts` | Bezpieczeństwo |
| 3 | JWT refresh akceptuje dowolny błąd | `lib/auth.ts` | Bezpieczeństwo |
| 4 | `<img>` zamiast `<Image>` w CMS | `app/[...slug]/page.tsx` | SEO/wydajność |
| 5 | Podwójne zapytanie DB (cache) | `app/[...slug]/page.tsx` | Wydajność |

### Priorytet MEDIUM

| # | Problem | Plik | Kategoria |
|---|---------|------|-----------|
| 6 | SSRF w syncICalFeed | `actions/ical.ts` | Bezpieczeństwo |
| 7 | Sanitizer: brak `rel="noopener"` | `lib/sanitize.ts` | Bezpieczeństwo |
| 8 | Stale closure w ReservationModal | `components/ReservationModal.tsx` | Logika/Bug |
| 9 | Hardcoded Umami website-id | `app/layout.tsx` | Bezpieczeństwo |
| 10 | Sortowanie klientów po computed fields | `actions/clients.ts` | Logika/Bug |
| 11 | `syncAllFeeds` sekwencyjny — timeout | `actions/ical.ts` | Wydajność |
| 12 | `force-dynamic` na CMS subpages | `app/[...slug]/page.tsx` | Wydajność |
| 13 | N+1 queries w iCal sync | `actions/ical.ts` | Wydajność DB |
| 14 | Optymalizacja `gal_00.webp` (1.4 MB) | `public/assets/` | Wydajność |
| 15 | Dynamic import DatePicker | `components/HomeClient.tsx` | Bundle size |
| 16 | Walidacja `maxGuests` z settings | `app/api/reservations/route.ts` | Logika |
| 17 | Rozbicie HomeClient.tsx (947 linii) | `components/HomeClient.tsx` | Utrzymanie |

### Priorytet NISKI

| # | Problem | Plik | Kategoria |
|---|---------|------|-----------|
| 18 | Dashboard allReservations bez limitu | `app/admin/dashboard/page.tsx` | Wydajność |
| 19 | Rate limiter fence-post error (6 vs 5) | `lib/rate-limit.ts` | Bezpieczeństwo |
| 16 | Fallback `admin@example.com` | `lib/env.ts` | Bezpieczeństwo |
| 17 | Podwójne odczyty siteSettings per request | `layout.tsx` + `page.tsx` | Wydajność |
| 18 | `new Date()` przy każdym renderze | `components/HomeClient.tsx` | Wydajność |
| 19 | Scroll listener re-rejestrowany na datach | `components/HomeClient.tsx` | Wydajność |
| 20 | `'use server'` na route handler | `app/api/admin/.../export/route.ts` | Porządek |
| 21 | `loading.tsx` w kluczowych route'ach | `app/admin/`, `app/[...slug]/` | UX |
| 22 | CSP header | `next.config.ts` | Bezpieczeństwo |
| 23 | Cache `getSettings()` | `actions/settings.ts` | Wydajność |
| 24 | Revalidation na robots/sitemap | `app/robots.ts`, `app/sitemap.ts` | Wydajność |
| 25 | Usunąć martwy endpoint uploads | `app/api/uploads/[...path]/` | Porządek |
| 26 | Indeks `GalleryImage.sectionId` | `prisma/schema.prisma` | DB |
| 27 | Indeks `Session.expiresAt` | `prisma/schema.prisma` | DB |
| 28 | Usunąć/zaimplementować `minNightsWeekend` | `actions/settings.ts` | Porządek |
| 29 | Zoptymalizować `hommm.svg` (80 KB) | `public/assets/hommm.svg` | Wydajność |
| 30 | Usunąć `.astro/` i `dist/` | root | Porządek |
| 31 | Token iCal w header zamiast URL | `app/api/ical/export/route.ts` | Bezpieczeństwo |
| 32 | Wykorzystać wariant `mobileUrl` | Frontend publiczny | UX mobilny |
| 33 | Usunąć `logo.png` jeśli nieużywany | `public/assets/` | Porządek |

---

## 10. Historia napraw (wcześniejsze rundy)

Poniższe problemy zostaly wykryte i naprawione we wcześniejszych rundach audytu:

| # | Problem | Status |
|---|---------|--------|
| XSS w szablonach emaili (`interpolate` bez escape) | NAPRAWIONE |
| XSS w `logoUrl` emaila (brak `escapeAttr`) | NAPRAWIONE |
| `force-dynamic` na stronie glownej → ISR `revalidate=60` | NAPRAWIONE |
| Availability endpoint ujawniał statusy płatności | NAPRAWIONE |
| Brak walidacji daty w `addBlockedDate` | NAPRAWIONE |
| `postMessage` z `'*'` targetOrigin | NAPRAWIONE |
| Hardkodowany `UMAMI_WEBSITE_ID` | NAPRAWIONE |
| Cron export — sanityzacja JSON w HTML emaila | NAPRAWIONE |
| Podwójne DB queries przy emailach → `loadEmailContext()` | NAPRAWIONE |
| Dashboard 13 → 9 zapytań (groupBy na statusach) | NAPRAWIONE |
| Brak AVIF w formatach obrazów | NAPRAWIONE |
| Martwa zależność `pg` | NAPRAWIONE |
| `@types/sharp` przeniesiony do devDependencies | NAPRAWIONE |
| Martwy kod: `handleSocialClick`, `SLUG_TO_EXPAND`, unused `adminId` | NAPRAWIONE |
| Cache w `getAdminSecretCode` | NAPRAWIONE |
| AdminShell `<img>` → `next/image` | NAPRAWIONE |
| Preconnect do `p.typekit.net` | NAPRAWIONE |
| Rate limiting na rezerwacjach (in-memory) | NAPRAWIONE |
| JWT expiry skrócony z 7 dni do 24h | NAPRAWIONE |
| Typekit — preconnect dodany | NAPRAWIONE |

**Łącznie naprawionych: 20 problemów w 18 plikach.**

---

## Podsumowanie

Aplikacja jest dobrze zaprojektowana z konsekwentnym wzorcem bezpieczeństwa, walidacją danych i poprawną konfiguracją. Pipeline przetwarzania obrazów jest wydajny. Po wcześniejszych 3 rundach napraw znaleziono **37 nowych/pozostałych problemów** (5 HIGH, 12 MEDIUM, 20 LOW).

**TOP 8 rekomendacji (szybkie, duży wpływ):**

1. **Middleware matcher → dodać `/api/admin/*`** — jedna linia, chroni API admin
2. **Rate limiting na login** — reuse istniejącego `checkRateLimit()`
3. **JWT refresh → łapać tylko `JWTExpired`** — import `errors` z jose + warunek
4. **SSRF w iCal sync → walidacja URL** — sprawdzić protokół i host przed fetch
5. **Stale closure w ReservationModal** — przenieść logikę resetu do `handleClose`
6. **`<img>` → `<Image>` w podstronach CMS** — SEO + optymalizacja automatyczna
7. **React `cache()` na `getPageBySlug`** — eliminacja podwójnego zapytania DB
8. **Umami website-id → env var** — usunąć hardcoded ID z kodu

Żaden z problemów nie jest krytyczny w sensie natychmiastowego exploitu — ale punkty 1-4 powinny zostać zaadresowane przed kolejnym deployem produkcyjnym.
