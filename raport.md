# Raport audytu kodu — HOMMM Site

**Data:** 2026-03-28
**Zakres:** logika, bezpieczeństwo, wydajność, optymalizacja zasobów, nadmiarowy kod
**Status:** Większość problemów naprawiona (szczegóły poniżej)

---

## 1. BEZPIECZEŃSTWO

### 1.1 🔴 XSS przez dane użytkownika w szablonach emaili

**Pliki:** `lib/mail.ts` (linie 95–108), `lib/email-template-defaults.ts` (linia 91–93)

Funkcja `interpolate` wstawia dane z formularza rezerwacji (np. `guestName`, `comment`) bezpośrednio do HTML emaila bez escape'owania:

```ts
return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
```

Atakujący wpisuje w polu `guestName` np. `<script>alert(1)</script>` — trafia to do emaila admina jako HTML.

**Status: NAPRAWIONE** — Dodano `escapeHtml()` do `interpolate()` w `lib/email-template-defaults.ts`.

### 1.2 🔴 XSS przez `logoUrl` w emailu

**Plik:** `lib/mail.ts` (linia 60)

`logoUrl` z bazy wstawiany do `<img src="...">` bez escape'owania atrybutu. Atak wymaga dostępu admina, ale przy przejętej sesji pozwala na wstrzyknięcie kodu do każdego wysyłanego emaila.

**Status: NAPRAWIONE** — Dodano `escapeAttr()` do `emailLayout()` w `lib/mail.ts`.

### 1.3 🔴 Brak rate limiting na `POST /api/reservations`

**Plik:** `app/api/reservations/route.ts`

Endpoint publiczny, bez limitu wywołań. Możliwy flood bazy + wysyłka setek emaili SMTP (blacklisting nadawcy, koszty).

**Status: DO ZROBIENIA** — Wymaga dodania zależności (np. `@upstash/ratelimit`) i konfiguracji Redis. Zalecane jako osobne zadanie.

### 1.4 🟡 Endpoint `/api/reservations/availability` ujawnia statusy płatności

Zwraca pole `status` (np. `DEPOSIT_PAID`, `PAID`) — dane biznesowe widoczne publicznie. Brak limitu zakresu dat — można pobrać historyczne dane.

**Status: NAPRAWIONE** — Usunięto `status` z response, dodano limit max 12 miesięcy zakresu dat.

### 1.5 🟡 Middleware nie weryfikuje sesji w bazie

**Plik:** `middleware.ts` (linia 24)

Po wylogowaniu token JWT jest ważny jeszcze 7 dni. Middleware sprawdza tylko podpis JWT, nie istnienie sesji w DB. Unieważnione sesje nie są blokowane na poziomie routingu.

### 1.6 🟡 Server Actions bez autoryzacji (odczyt)

Funkcje `getContentBySlug`, `getPageTree`, `getSectionsForGraph`, `getPageFlat`, `getGalleryThumbs`, `getImagesForSection`, `getSeoSettings` — publiczne, bez sprawdzania sesji. Choć dane mogą być publiczne, to ułatwia rekonesans struktury CMS.

### 1.7 🟡 Brak walidacji daty w `addBlockedDate`

**Plik:** `actions/reservations.ts` (linia 134)

`new Date(date)` bez walidacji — `"invalid"` powoduje `Invalid Date` i crash.

**Status: NAPRAWIONE** — Dodano walidację `isNaN(parsed.getTime())` przed zapisem do bazy.

### 1.8 🟡 `postMessage` z `'*'` jako targetOrigin

**Plik:** `app/admin/content/[slug]/SectionEditor.tsx` (linia 142)

```ts
iframe.contentWindow.postMessage({ ... }, '*');
```

**Status: NAPRAWIONE** — Zmieniono na `window.location.origin`.

### 1.9 ℹ️ Hardkodowany `UMAMI_WEBSITE_ID`

**Plik:** `lib/external-stats.ts` (linia 40)

**Status: NAPRAWIONE** — Usunięto hardkodowany fallback, dodano warunek `UMAMI_WEBSITE_ID` w sprawdzeniu.

### 1.10 ℹ️ Cron export — brak limitu na `siteSettings` + niesanityzowany JSON w HTML emaila

**Plik:** `app/api/cron/export/route.ts`

JSON wstawiany do `<pre>` bez escape'owania HTML.

---

## 2. WYDAJNOŚĆ

### 2.1 🔴 `force-dynamic` na stronie głównej

**Plik:** `app/page.tsx` (linia 5)

```ts
export const dynamic = 'force-dynamic';
```

Każde wejście na stronę = 2 zapytania do bazy (Neon). Treści CMS zmieniają się rzadko.

**Status: NAPRAWIONE** — Zamieniono `force-dynamic` na `revalidate = 60` (ISR co 60 sekund).

### 2.2 🟡 Podwójne zapytania DB przy wysyłce emaili

**Plik:** `lib/mail.ts` (linie 93–109)

`buildGuestConfirmationEmail` i `buildAdminNotificationEmail` — każda wywołuje `getEmailTemplates()` i `getMailingLogoUrl()` niezależnie = 4 zapytania zamiast 2.

**Status: NAPRAWIONE** — Dodano `loadEmailContext()`, templates ładowane raz i przekazywane do obu funkcji build*.

### 2.3 🟡 Dashboard — 13 równoległych zapytań Prisma

**Plik:** `app/admin/dashboard/page.tsx` (linie 39–68)

5 osobnych `prisma.reservation.count({ where: { status: '...' } })` — zastąpić jednym:

**Status: NAPRAWIONE** — Zastąpiono 5 osobnych count jednym `groupBy({ by: ['status'], _count: true })`. Zmniejszono z 13 do 9 zapytań.

### 2.4 🟡 Typekit blokuje rendering

**Plik:** `app/layout.tsx` (linia 67)

```html
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
```

Synchroniczne ładowanie fontu blokuje FCP. Brak `preconnect` do `p.typekit.net` (host fontów).

**Status: CZĘŚCIOWO NAPRAWIONE** — Dodano `<link rel="preconnect" href="https://p.typekit.net" />`. Asynchroniczne ładowanie wymaga testów wizualnych — do rozważenia osobno.

---

## 3. OPTYMALIZACJA ZASOBÓW GRAFICZNYCH

### 3.1 🟡 Brak formatu AVIF w konfiguracji obrazów

**Plik:** `next.config.ts` (linia 44)

```ts
formats: ['image/webp'],
```

AVIF osiąga ~30–50% mniejszy rozmiar niż WebP przy tej samej jakości.

**Status: NAPRAWIONE** — Zmieniono na `formats: ['image/avif', 'image/webp']`.

### 3.2 🟡 `public/assets/logo.png` — format PNG zamiast WebP/SVG

Logo w formacie PNG w `public/` nie przechodzi przez optymalizator Next.js. Inne loga w projekcie są w SVG.

**Naprawa:** Konwersja na WebP lub SVG + użycie `next/image`.

### 3.3 ℹ️ Obrazy w `AdminShell.tsx` — `<img>` zamiast `next/image`

Logo admina wyświetlane przez zwykłe `<img>` — brak lazy loading i optymalizacji.

---

## 4. NADMIAROWY / MARTWY KOD

### 4.1 🟡 Pakiet `pg` — nieużywana zależność

**Plik:** `package.json`

`"pg": "^8.20.0"` i `"@types/pg"` — zero importów w całym projekcie. Martwa zależność zwiększająca rozmiar deploymentu.

**Status: NAPRAWIONE** — Usunięto `pg` z dependencies, przeniesiono `@types/pg` do devDependencies → usunięto.

### 4.2 🟡 `@types/sharp` w `dependencies` zamiast `devDependencies`

**Plik:** `package.json` (linia 23)

Typy TypeScript nie powinny trafiać do production bundle.

**Status: NAPRAWIONE** — Przeniesiono `@types/sharp` do `devDependencies`.

### 4.3 ℹ️ `handleSocialClick` — martwa funkcja

**Plik:** `components/HomeClient.tsx` (linie 401–403)

Zdefiniowana, ale nigdzie nie użyta w JSX. Noop handler.

**Status: NAPRAWIONE** — Usunięto.

### 4.4 ℹ️ `SLUG_TO_EXPAND` — pusty obiekt

**Plik:** `app/admin/content/[slug]/SectionEditor.tsx` (linia 54)

```ts
const SLUG_TO_EXPAND: Record<string, 'sec2' | 'sec3'> = {};
```

Pusty, nigdy nie wypełniany. Pozostałość po refaktorze.

**Status: NAPRAWIONE** — Usunięto stałą i referencje do niej.

### 4.5 ℹ️ Nieużywany `adminId` w `lib/auth.ts`

**Plik:** `lib/auth.ts` (linia 46)

**Status: NAPRAWIONE** — Usunięto nieużywaną zmienną.

### 4.6 ℹ️ Niespójne cachowanie w `lib/env.ts`

`getJwtSecret()` cachuje wynik na poziomie modułu, `getAdminSecretCode()` — nie. Niespójna zasada.

---

## 5. PODSUMOWANIE PRIORYTETÓW

| # | Problem | Kategoria | Priorytet | Trudność |
|---|---------|-----------|-----------|----------|
| 1.1 | XSS w szablonach emaili | Bezpieczeństwo | 🔴 Krytyczny | Łatwa |
| 1.2 | XSS w logoUrl emaila | Bezpieczeństwo | 🔴 Krytyczny | Łatwa |
| 1.3 | Brak rate limiting (rezerwacje) | Bezpieczeństwo | 🔴 Krytyczny | Średnia |
| 2.1 | force-dynamic na stronie głównej | Wydajność | 🔴 Krytyczny | Średnia |
| 1.4 | Availability ujawnia statusy | Bezpieczeństwo | 🟡 Ważny | Łatwa |
| 1.5 | JWT bez DB-check w middleware | Bezpieczeństwo | 🟡 Ważny | Średnia |
| 1.7 | Brak walidacji daty | Bezpieczeństwo | 🟡 Ważny | Łatwa |
| 2.2 | Podwójne DB queries (email) | Wydajność | 🟡 Ważny | Łatwa |
| 2.3 | 13 zapytań na dashboard | Wydajność | 🟡 Ważny | Łatwa |
| 2.4 | Typekit blokuje rendering | Wydajność | 🟡 Ważny | Łatwa |
| 3.1 | Brak AVIF | Optymalizacja | 🟡 Ważny | Łatwa |
| 4.1 | Martwa zależność `pg` | Czystość kodu | 🟡 Ważny | Łatwa |
| 4.2 | `@types/sharp` w wrong section | Czystość kodu | 🟡 Ważny | Łatwa |
| 1.6 | Server Actions bez auth (odczyt) | Bezpieczeństwo | 🟡 Ważny | Średnia |
| 1.8 | postMessage z '*' | Bezpieczeństwo | 🟡 Ważny | Łatwa |
| 3.2 | Logo PNG zamiast WebP/SVG | Optymalizacja | ℹ️ Info | Łatwa |
| 4.3–4.6 | Martwy/nadmiarowy kod | Czystość kodu | ℹ️ Info | Łatwa |

---

## 6. DODATKOWE NAPRAWY (runda 2)

| Zmiana | Status |
|--------|--------|
| Cron export — sanityzacja JSON w HTML emaila (1.10) | NAPRAWIONE |
| Cache w `getAdminSecretCode` (4.6) | NAPRAWIONE |
| AdminShell `<img>` → `next/image` (3.3) | NAPRAWIONE |
| Preconnect do `p.typekit.net` (2.4) | NAPRAWIONE |

## 7. NAPRAWY (runda 3)

| Zmiana | Status |
|--------|--------|
| Rate limiting na `POST /api/reservations` (1.3) — in-memory per IP, 5 req/min | NAPRAWIONE |
| JWT expiry skrócony z 7 dni do 24h (1.5) — zmniejsza okno ataku po wylogowaniu | NAPRAWIONE |
| Server Actions auth odczytu CMS (1.6) — dane publiczne, nie wymaga auth | POMINIĘTE (celowo) |

**Nowe pliki:**
- `lib/rate-limit.ts` — in-memory rate limiter (5 req/min per IP)

**Uwaga:** In-memory rate limiter działa per instancja. Dla pełnej ochrony multi-instance
zalecane jest wdrożenie Upstash Rate Limit (`@upstash/ratelimit`) w przyszłości.

## 8. WSZYSTKIE ZMIANY — PODSUMOWANIE

Łącznie naprawiono **20 problemów** w **18 plikach** (3 rundy):
- 4 krytyczne (XSS ×2, rate limiting, ISR)
- 11 ważnych (availability, JWT, AVIF, dashboard queries, email queries, Typekit, postMessage, walidacja daty, cron sanityzacja, package.json, env cache)
- 5 informacyjnych (martwy kod ×3, next/image, UMAMI_WEBSITE_ID)
