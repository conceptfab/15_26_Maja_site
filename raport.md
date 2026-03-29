# Raport audytu kodu — HOMMM (maja-site)

**Data:** 2026-03-29
**Zakres:** Analiza logiki, wydajności, bezpieczeństwa, optymalizacji, nadmiarowego kodu
**Stack:** Next.js 15 (App Router), Prisma 7 + Neon Postgres, Vercel Blob, TypeScript, Tailwind CSS

---

## Spis treści

1. [Bezpieczeństwo](#1-bezpieczeństwo)
2. [Duplikacje i reuse kodu](#2-duplikacje-i-reuse-kodu)
3. [Wydajność i optymalizacja](#3-wydajność-i-optymalizacja)
4. [Optymalizacja obrazów i plików statycznych](#4-optymalizacja-obrazów-i-plików-statycznych)
5. [Jakość kodu i architektura](#5-jakość-kodu-i-architektura)
6. [Bundle size i zależności](#6-bundle-size-i-zależności)
7. [Caching i bazy danych](#7-caching-i-bazy-danych)
8. [Podsumowanie priorytetów](#8-podsumowanie-priorytetów)

---

## 1. Bezpieczeństwo

### [KRYTYCZNE] S1 — Brak `verifySession()` w `app/admin/reservations/[id]/page.tsx`

**Plik:** `app/admin/reservations/[id]/page.tsx:18`

Strona RSC (Server Component) pobiera rezerwację bezpośrednio przez `prisma.reservation.findUnique()` bez wywołania `verifySession()`. Middleware weryfikuje jedynie podpis JWT — nie sprawdza sesji w DB ani czy admin jest aktywny. Osoba znająca ID rezerwacji może zobaczyć dane osobowe gościa (imię, email, telefon, komentarz, kwota).

**Naprawa:** Dodać `const session = await verifySession(); if (!session) redirect('/admin/login');` przed zapytaniem Prisma.

**Wpływ RODO:** Wyciek danych osobowych bez uwierzytelnienia.

---

### [KRYTYCZNE] S2 — Middleware nie waliduje sesji w DB

**Plik:** `middleware.ts:22-25`

`middleware.ts` sprawdza tylko podpis JWT (`jwtVerify`), nie sprawdza czy sesja istnieje w DB ani czy admin jest aktywny. Jeżeli sesja zostanie usunięta z DB (np. wylogowanie), JWT nadal będzie ważny do 24h. Ktoś kto skopiuje cookie ma dostęp mimo wylogowania.

**Naprawa:** Rozważyć krótszy TTL JWT (np. 1h zamiast 24h) lub sprawdzanie sesji DB w middleware dla wrażliwych operacji. Alternatywnie: cache sesji w pamięci z krótkim TTL.

---

### [WAŻNE] S3 — Publiczne server actions bez autoryzacji

**Pliki:**
- `actions/settings.ts:83` — `getSettings()` zwraca WSZYSTKIE ustawienia serwisu (NIP, adres, kontakt)
- `actions/pricing.ts:54` — `getActivePricingRules()` oznaczony `'use server'` bez auth
- `actions/content.ts:20` — `getContentBySlug()` w pliku `'use server'` bez auth

Funkcje w plikach z `'use server'` są wywoływalne jako server actions z klienta. Każdy może je wywołać.

**Naprawa:** Rozdzielić na `getPublicSettings()` (tylko ceny/limity potrzebne publicznej stronie) i `getSettings()` (z auth). Albo przenieść publiczne funkcje do oddzielnego modułu (bez `'use server'`).

---

### [WAŻNE] S4 — Brak sanityzacji `customHeadTags` w SEO

**Plik:** `actions/seo.ts:49`

`updateGlobalSeo()` zapisuje `customHeadTags` (surowy HTML) do DB bez walidacji. Jeżeli admin poda XSS payload, zostanie wyrenderowany w `<head>` strony publicznej.

**Naprawa:** Waliduj/ograniczaj dozwolone tagi w `customHeadTags` (np. tylko `<meta>`, `<link>`, `<script src>`).

---

### [WAŻNE] S5 — Brak walidacji Zod na wejściu server actions

**Pliki:**
- `actions/seo.ts:49,71` — `updateGlobalSeo()` i `updatePageSeo()` bez Zod schema
- `actions/content.ts:53-79` — `updateContent()` przyjmuje `bgImage`/`bgColor` bez walidacji URL/hex
- `actions/mailing.ts:18` — `updateMailingLogoUrl()` akceptuje `../../etc/passwd`

**Naprawa:** Dodać Zod schema dla każdej server action przyjmującej dane z zewnątrz. Walidować URL (musi zaczynać się od `/` lub `https://`) i kolor (regex hex).

---

### [WAŻNE] S6 — Cron export wysyła dane osobowe emailem bez szyfrowania

**Plik:** `app/api/cron/export/route.ts:44-55`

Dane rezerwacji (emaile, imiona gości) są przesyłane w plain HTML mailem. Potencjalny problem RODO.

**Naprawa:** Rozważyć szyfrowanie załącznika lub link do panelu zamiast danych inline.

---

### [WAŻNE] S7 — Brak walidacji długości `updateLlmsTxt()`

**Plik:** `actions/seo.ts:92`

Brak limitu rozmiaru contentu. Admin może zapisać dowolnie duży tekst, co może spowodować problemy z DB.

---

### [DROBNE] S8 — Rate limiter jest in-memory

**Plik:** `lib/rate-limit.ts`

Przy wielu instancjach Vercel (Fluid Compute) rate limit nie jest współdzielony. Komentarz w kodzie to dokumentuje. Do rozważenia: Upstash Rate Limit dla produkcji.

---

## 2. Duplikacje i reuse kodu

### [KRYTYCZNE] D1 — `calculatePrice` duplikuje logikę `getNightDetails`

**Plik:** `lib/pricing.ts:64-116` vs `lib/pricing.ts:131-191`

Obie funkcje iterują noc po nocy z identyczną logiką: `findPricingRule` → `isHighSeason` → `isWeekendNight` → priorytet: rule > season > weekend > base. Jest subtelna różnica w logice weekendowej (zapis, nie efekt), co jest źródłem potencjalnych błędów.

**Naprawa:**
```ts
export function calculatePrice(checkIn, checkOut, settings, pricingRules) {
  const details = getNightDetails(checkIn, checkOut, settings, pricingRules);
  const nights = details.map(d => d.price);
  // ... discount, deposit logic (bez zmian)
}
```
Eliminuje ~30 linii zduplikowanej logiki.

---

### [WAŻNE] D2 — Proporcjonalny przychód — 6 wystąpień tego samego obliczenia

**Pliki:**
- `app/admin/dashboard/page.tsx:95,103`
- `actions/reports.ts:42,50,95,112`

Pattern: `r.nights > 0 ? r.totalPrice * (nights / r.nights) : 0`

**Naprawa:** Wyodrębnić helper `proportionalRevenue(totalPrice, totalNights, overlapNights)` w `lib/date-utils.ts`.

---

### [WAŻNE] D3 — IP extraction zduplikowany w route handlerach

**Pliki:**
- `app/api/reservations/route.ts:19-21`
- `app/api/auth/login/route.ts:12-14`

**Naprawa:** Wyodrębnić `getClientIp(request: Request): string` w `lib/request-utils.ts`.

---

### [WAŻNE] D4 — Email builder — zduplikowany pattern budowania vars

**Plik:** `lib/mail.ts:108-132`

`buildGuestConfirmationEmail` i `buildAdminNotificationEmail` mają identyczny schemat.

**Naprawa:** Prywatna funkcja `buildEmailFromTemplate(templateKey, data, ctx?)`.

---

### [WAŻNE] D5 — `emailLayout` zduplikowany w MailingEditor preview

**Pliki:**
- `lib/mail.ts:70-86` — `emailLayout()`
- `app/admin/mailing/MailingEditor.tsx:31-47` — `buildPreviewHtml()` (kopia)

Zmiana layoutu w jednym miejscu nie zaktualizuje drugiego.

**Naprawa:** Eksportować `emailLayout` i użyć w obu miejscach.

---

### [WAŻNE] D6 — Budowanie `emailData` powtarza się w 2 miejscach

**Pliki:**
- `app/api/reservations/route.ts:124-135`
- `actions/reservations.ts:317-327`

**Naprawa:** Wyodrębnić `toReservationEmailData(reservation): ReservationEmailData`.

---

### [DROBNE] D7 — `escapeHtml` vs `escapeAttr` — dwie osobne funkcje escape

**Pliki:** `lib/email-template-defaults.ts:104` vs `lib/mail.ts:66`

`escapeAttr` jest podzbiorem `escapeHtml`. Można użyć jednej (bezpieczniejszej).

---

### [DROBNE] D8 — `MONTH_NAMES` w `lib/reservation-status.ts` vs `MONTH_NAMES_FULL` w `ReportsClient.tsx`

Różne konteksty (skróty vs pełne nazwy), ale obie stałe powinny być w jednym pliku (`lib/format.ts`).

---

### [DROBNE] D9 — Inline type `Reservation` w `ReservationsClient.tsx`

Brak centralnego eksportowanego typu. Powinien używać `Awaited<ReturnType<typeof getReservations>>`.

---

## 3. Wydajność i optymalizacja

### [KRYTYCZNE] P1 — `HomeClient.tsx` — monolityczny ~977-liniowy client component

**Plik:** `components/HomeClient.tsx`

Cały content strony głównej renderowany w jednym `'use client'` komponencie. Konsekwencje:
- Cały JS musi być pobrany i zhydratowany zanim strona stanie się interaktywna
- Brak streaming/Suspense dla poszczególnych sekcji
- `date-fns`, `react-datepicker`, `sanitize-html` ładowane od razu

**Naprawa:** Rozdzielić na mniejsze komponenty. Sekcje hero/koncept/miejsce/kontakt mogą być Server Components. Kalendarz rezerwacji już jest `dynamic` (dobrze). Sekcja kontaktowa jest statyczna — nie potrzebuje JS.

---

### [WAŻNE] P2 — `sanitize-html` w client bundle (redundantne)

**Plik:** `components/HomeClient.tsx:6`

`sanitize-html` (~30KB min) importowany w client component. Dane z własnego CMS powinny być sanityzowane po stronie serwera (przy zapisie w `actions/content.ts`).

**Naprawa:** Przenieść sanityzację do `getHomeContent()` po stronie serwera. Usunąć import z klienta.

---

### [WAŻNE] P3 — Sekwencyjne zapytania w POST /api/reservations

**Plik:** `app/api/reservations/route.ts:43,61`

`getSettings()` i `getActivePricingRules()` wykonywane sekwencyjnie, choć są niezależne.

**Naprawa:**
```ts
const [settings, pricingRules] = await Promise.all([getSettings(), getActivePricingRules()]);
```

---

### [WAŻNE] P4 — `getClients()` pobiera WSZYSTKICH klientów do pamięci

**Plik:** `actions/clients.ts:56-71`

Przy `sortBy = 'reservationCount' | 'totalSpent'` pobiera wszystkich klientów z rezerwacjami, sortuje w JS, paginuje. Przy rosnącej liczbie klientów — problematyczne.

**Naprawa:** Raw SQL z `COUNT`/`SUM` agregacjami i `ORDER BY` na poziomie DB.

---

### [WAŻNE] P5 — `verifySession()` — 1-2 DB round-tripy per admin request

**Plik:** `lib/auth.ts:44-99`

Każdy admin request: JWT verify → `session.findUnique` z `include: { admin }` → opcjonalny `session.update`. To 1-2 round-tripy do Neon (~20-50ms per query).

**Naprawa:** Rozważyć `React.cache` do cache'owania sesji w ramach requestu lub dane admina w JWT payload (eliminuje DB lookup gdy JWT ważny).

---

### [WAŻNE] P6 — Brak równoległości w kilku endpointach

**Pliki:**
- `app/api/reservations/availability/route.ts:20-33` — reservations + blockedDates sekwencyjnie
- `app/api/ical/export/route.ts:32-39` — to samo
- `actions/mailing.ts:46-53` — 3 niezależne odczyty sekwencyjnie

**Naprawa:** `Promise.all()` wszędzie gdzie zapytania są niezależne.

---

### [WAŻNE] P7 — `syncAllFeeds()` wywołuje `syncICalFeed()` z ponownym auth check

**Plik:** `actions/ical.ts:207-229`

`syncAllFeeds()` weryfikuje sesję, a potem wywołuje `syncICalFeed()` N razy, który też weryfikuje sesję — N+1 auth checks.

**Naprawa:** Wydzielić `_syncICalFeedInternal(id)` bez auth.

---

### [WAŻNE] P8 — Rate-limit store bez limitu rozmiaru mapy

**Plik:** `lib/rate-limit.ts:12`

`store = new Map<string, Entry>()` bez górnego limitu. Cleanup co 5 min pomaga, ale mapa może rosnąć bez ograniczeń.

**Naprawa:** Dodać `MAX_STORE_SIZE` (np. 10000). Przy przekroczeniu — czyścić najstarsze wpisy.

---

### [DROBNE] P9 — `today` w `HomeClient.tsx` memoizowane z pustym deps

**Plik:** `components/HomeClient.tsx:168`

```ts
const today = useMemo(() => new Date(), []);
```

Jeśli użytkownik trzyma stronę otwartą przez noc, `today` będzie wczorajszą datą.

**Naprawa:** Odświeżać co minutę lub przy focus.

---

### [DROBNE] P10 — `createSession` czyści wygasłe sesje przy KAŻDYM logowaniu

**Plik:** `lib/auth.ts:14-16`

Lepiej robić to w cron jobie niż na hot-path logowania.

---

### [DROBNE] P11 — `updateImageOrder` — N oddzielnych UPDATE w transakcji

**Plik:** `actions/gallery.ts:83-94`

Każdy obraz aktualizowany osobnym zapytaniem. Przy 20+ obrazach to 20+ round-tripów.

**Naprawa:** Raw SQL z `CASE WHEN` dla batch update.

---

## 4. Optymalizacja obrazów i plików statycznych

### [WAŻNE] I1 — Hero image preload bypass'uje Next.js Image Optimization

**Plik:** `app/layout.tsx:78-83`

```html
<link rel="preload" as="image" type="image/webp" href="/assets/hero.webp" />
```

Ładuje **oryginalny** plik `/assets/hero.webp` zamiast zoptymalizowanej wersji z `/_next/image`. Jednocześnie `SectionBg` używa `next/image` z `priority`, co dodaje własny preload. **Podwójny preload** — jeden omija optymalizację.

**Naprawa:** Usunąć ręczny `<link rel="preload">` z `layout.tsx`. Prop `priority` na `next/image` w `SectionBg` już załatwia preload.

---

### [WAŻNE] I2 — Galeria nie używa `thumbUrl`/`mobileUrl`

**Plik:** `components/HomeClient.tsx:626-631`

```tsx
<Image src={image.src} fill sizes="..." />
```

Używa pełnego `src` (webpUrl) zamiast `thumbSrc` dla miniaturek. DB ma `thumbUrl` i `mobileUrl` — powinny być używane.

**Naprawa:** Dla miniaturek w galerii: `image.thumbSrc || image.src`. W lightbox: pełny `src`.

---

### [DROBNE] I3 — Brak `placeholder="blur"` dla obrazów galerii

Obrazy w galerii/lightbox nie mają blur placeholder — powoduje layout shift.

**Naprawa:** Dodać `placeholder="blur"` z `blurDataURL` (low-quality base64).

---

### [DROBNE] I4 — Konfiguracja `next/image` poprawna

`next.config.ts` poprawnie konfiguruje:
- `formats: ['image/avif', 'image/webp']` — AVIF ma priorytet (lepsza kompresja)
- `deviceSizes` i `imageSizes` — sensowne wartości
- `remotePatterns` dla Vercel Blob — poprawne

**Status: OK** — konfiguracja optymalizacji obrazów jest poprawna.

---

### [DROBNE] I5 — Pliki statyczne w `public/assets/` — formaty

Wszystkie główne obrazy są w `.webp` — to dobrze. SVG (`hommm.svg`, `cfab_logo_2026.svg`) — poprawnie nie przechodzą przez `next/image`. Logo `.webp` — OK.

**Status: OK** — formaty plików są odpowiednie.

---

## 5. Jakość kodu i architektura

### [WAŻNE] Q1 — Wielokrotne `as` castowanie Prisma JSON bez walidacji

**Pliki:**
- `actions/settings.ts:108` — `value as object`
- `lib/email-templates.ts:14,25` — `setting.value as { url: string }`, `as Partial<EmailTemplatesMap>`
- `actions/mailing.ts:39` — `updated as object`

**Naprawa:** Walidować dane z DB przez Zod schema po deserializacji.

---

### [WAŻNE] Q2 — `Record<string, unknown>` zamiast typu Prisma w where clauses

**Pliki:**
- `actions/reservations.ts:43`
- `actions/clients.ts:36`
- `app/api/admin/reservations/export/route.ts:27`

**Naprawa:** Użyć `Prisma.ReservationWhereInput`.

---

### [WAŻNE] Q3 — `DatePicker` z podwójnym `as any`

**Plik:** `components/HomeClient.tsx:12`

```ts
const DatePicker = dynamic(() => import('react-datepicker') as any, { ssr: false }) as any;
```

Całkowite wyłączenie type safety.

**Naprawa:** Użyć poprawnego typowania dla dynamic import `react-datepicker`.

---

### [WAŻNE] Q4 — Dashboard `getStats()` — ~300 linii monolityczna funkcja

**Plik:** `app/admin/dashboard/page.tsx:21-290`

9 równoczesnych zapytań Prisma + 3 kolejne. Łamie SRP.

**Naprawa:** Wydzielić do `lib/dashboard-stats.ts` i podzielić na mniejsze funkcje.

---

### [WAŻNE] Q5 — `SiteStructureGraph` trzyma `localPages` jako state zsynchronizowany z props

**Plik:** `components/admin/SiteStructureGraph.tsx:377-381`

`useState(pages)` + `useEffect` syncujący — klasyczny anti-pattern.

**Naprawa:** Użyć `key` na komponencie lub `useMemo`.

---

### [WAŻNE] Q6 — `AdminShell.tsx` — brak obsługi błędu fetch

**Plik:** `components/admin/AdminShell.tsx:201-214`

Trzy `fetch()` z `.catch(() => {})`. Przy błędzie API sidebar będzie pusty bez informacji.

**Naprawa:** Dodać state error i wyświetlić komunikat.

---

### [DROBNE] Q7 — `BlockedDate.type` jest `String` zamiast enum

**Plik:** `prisma/schema.prisma:138`

`type String @default("BLOCKED")` z komentarzem `// BLOCKED | SERVICE`.

**Naprawa:** Stworzyć `enum BlockedDateType { BLOCKED SERVICE }`.

---

### [DROBNE] Q8 — Surowe stringi statusów zamiast stałych

**Pliki:** Wiele plików w `actions/` i `app/api/`

Np. `status: { notIn: ['CANCELLED'] }` zamiast referencji do stałych z `reservation-status.ts`.

---

### [DROBNE] Q9 — Duplikacja `SECTION_ICONS`

**Pliki:**
- `lib/section-icons.ts` — mapowanie slug→ikona lucide
- `components/admin/SiteStructureGraph.tsx:22-27` — własna mapa z emoji

Dwa różne mapowania na to samo.

---

## 6. Bundle size i zależności

### [WAŻNE] B1 — `@xyflow/react` (~150KB+ gzipped) bez lazy-load

**Plik:** `components/admin/SiteStructureGraph.tsx`

Używana tylko na jednej stronie admina (site-structure).

**Naprawa:** `dynamic(() => import('./SiteStructureGraph'), { ssr: false })` w `app/admin/site-structure/client.tsx`.

---

### [WAŻNE] B2 — `sanitize-html` (~30KB) w client bundle

Patrz: P2. Powinno być po stronie serwera.

---

### [DROBNE] B3 — `shadcn` (CLI) w `dependencies` zamiast `devDependencies`

**Plik:** `package.json:44`

**Naprawa:** `npm install --save-dev shadcn` (przenieść do devDependencies).

---

### [DROBNE] B4 — `prisma` (CLI) w `dependencies` zamiast `devDependencies`

**Plik:** `package.json:39`

Uwaga: `postinstall: prisma generate` musi nadal działać na Vercel — ale Vercel instaluje także devDependencies przy budowaniu.

**Naprawa:** Przenieść do `devDependencies`.

---

## 7. Caching i bazy danych

### [WAŻNE] C1 — Brak cache na `getSettings()`

**Plik:** `actions/settings.ts:83-94`

Ustawienia zmieniają się bardzo rzadko, ale czytane przy każdym requeście (strona główna, POST rezerwacji, emaile).

**Naprawa:** `unstable_cache` z `revalidate: 300` i tagiem `'settings'`, invalidowanym przy `updateSettings`.

---

### [WAŻNE] C2 — Brak `Cache-Control` na availability endpoint

**Plik:** `app/api/reservations/availability/route.ts`

Endpoint wywoływany przy każdym otwarciu widoku rezerwacji — brak cache'owania.

**Naprawa:** `Cache-Control: s-maxage=30, stale-while-revalidate=60`.

---

### [DROBNE] C3 — Email templates — brak cache'owania

**Plik:** `lib/email-templates.ts:21-37`

`getEmailTemplates()` i `getMailingLogoUrl()` robią osobne zapytania do DB za każdym razem. Zmieniają się ekstremalnie rzadko.

---

### [DROBNE] C4 — `buildStatusChangeEmail` nie akceptuje pre-loaded context

**Plik:** `lib/mail.ts:134`

W przeciwieństwie do `buildGuestConfirmationEmail` i `buildAdminNotificationEmail`, które akceptują opcjonalny `ctx`, ta funkcja zawsze ładuje kontekst od nowa.

---

### [DROBNE] C5 — `getReservation(id)` bez `select`

**Plik:** `actions/reservations.ts:94-110`

`findUnique({ where: { id } })` bez `select` — pobiera wszystkie pola (w tym `adminNote`, `comment`, `statusHistory`).

---

## 8. Podsumowanie priorytetów

### Statystyki

| Priorytet | Ilość | Kategorie |
|-----------|-------|-----------|
| **KRYTYCZNE** | 4 | S1, S2, D1, P1 |
| **WAŻNE** | 22 | S3-S7, D2-D6, P2-P8, I1-I2, Q1-Q6, B1-B2, C1-C2 |
| **DROBNE** | 18 | Reszta |

### TOP 10 — Rekomendowane do natychmiastowej naprawy

| # | ID | Problem | Trudność |
|---|-----|---------|----------|
| 1 | S1 | Brak `verifySession()` w stronie rezerwacji — wyciek danych RODO | Niska |
| 2 | S3 | Publiczne server actions bez auth (`getSettings`, `getActivePricingRules`) | Średnia |
| 3 | S5 | Brak walidacji Zod na wejściu server actions SEO/content | Średnia |
| 4 | D1 | `calculatePrice` duplikuje `getNightDetails` — ryzyko rozbieżności | Niska |
| 5 | P1 | `HomeClient.tsx` monolityczny 977-liniowy client component | Wysoka |
| 6 | P2 | `sanitize-html` w client bundle (redundantne ~30KB) | Niska |
| 7 | I1 | Podwójny hero preload — jeden omija `next/image` optimization | Niska |
| 8 | I2 | Galeria nie używa `thumbUrl`/`mobileUrl` | Niska |
| 9 | P3 | Sekwencyjne zapytania w POST `/api/reservations` | Niska |
| 10 | C1 | Brak cache na `getSettings()` — niepotrzebne DB queries | Niska |

### Co działa dobrze

- Konfiguracja `next/image` z AVIF/WebP — poprawna
- Pliki statyczne w `.webp` — optymalny format
- `SectionBg` z `next/image fill` + `priority` — poprawne podejście do LCP
- Walidacja rezerwacji przez Zod — solidna
- Rate limiting na endpointach publicznych — obecny
- Transakcja `Serializable` przy tworzeniu rezerwacji — poprawna ochrona przed race conditions
- Emaile fire-and-forget (nie blokują odpowiedzi) — dobre podejście
- `revalidate = 60` na stronie głównej — sensowne
- Security headers w `next.config.ts` — kompletne (CSP, HSTS, X-Frame-Options)
- Prisma singleton z globalThis pattern — poprawne
- JWT refresh przy wygaśnięciu — dobry mechanizm bezpieczeństwa
- Dynamic import DatePicker i Lightbox — poprawny code-splitting

---

*Raport wygenerowany automatycznie przez Claude Code na podstawie analizy 3 równoległych agentów (reuse, quality, efficiency).*
