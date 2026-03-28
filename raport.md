# Raport audytu kodu — HOMMM (Next.js)

**Data:** 2026-03-28 | **Aktualizacja:** 2026-03-28 (weryfikacja po zmianach kodu)
**Zakres:** Bezpieczeństwo, logika biznesowa, wydajność, optymalizacja obrazów, konfiguracja, jakość kodu, nadmiarowy kod

---

## Podsumowanie

| Priorytet | Ilość | W tym naprawionych | Opis |
|-----------|-------|--------------------|------|
| KRYTYCZNE | 2 | 0 | Wyciek sekretów, brak poolingu SMTP |
| WYSOKIE | 8 | 0 | iCal bez tokena, brak walidacji, duplikacja kodu, N+1 queries |
| ŚREDNIE | 16 | 1 | Rate limiter in-memory, CSP unsafe-eval, brak dynamic imports, schema issues |
| NISKIE | 12 | 0 | Kosmetyka, drobne edge case'y, typowanie |

> **Uwaga po weryfikacji:** Kod zmienił się od pierwotnego audytu. Usunięto relikty (`index.html`, `style.css`), rozbudowano kalendarz o typ `SERVICE`, zmieniono wyświetlanie statusów rezerwacji (nowe kolory), rozdzielono dane wykresu na `paid`/`deposit`. Punkty naprawione oznaczono ✅. Dodano nowe uwagi tam, gdzie zmiany wprowadziły nowe kwestie.

---

## 1. BEZPIECZEŃSTWO

### 1.1 [KRYTYCZNE] Sekrety w pliku `.env` — rotacja konieczna

**Plik:** `.env`

Plik `.env` jest wprawdzie w `.gitignore`, ale zawiera pełne wartości: `JWT_SECRET`, `ADMIN_SECRET_CODE`, `SMTP_PASS`, `BLOB_READ_WRITE_TOKEN`, `VERCEL_TOKEN`, `NEON_API_KEY`, `DATABASE_URL` (z hasłem), `UMAMI_API_KEY`. Jeśli plik kiedykolwiek trafił do historii git, wszystkie sekrety są skompromitowane.

**Naprawa:**
- Natychmiast zrotować WSZYSTKIE sekrety.
- Przeskanować historię git: `git log --all --diff-filter=A -- .env`.
- Przenieść sekrety wyłącznie do Vercel Environment Variables.

---

### 1.2 [WYSOKIE] iCal export — brak tokena = otwarty dostęp

**Plik:** `app/api/ical/export/route.ts`

Jeśli `ICAL_EXPORT_TOKEN` nie jest ustawiony w env (a nie ma go w `.env`), cały warunek `if (ICAL_TOKEN)` jest pomijany i endpoint jest **całkowicie otwarty**. Każdy może pobrać pełną listę rezerwacji z imionami gości. Dodatkowo token w query string jest logowany w access logach.

**Naprawa:**
- Wymagać obecności `ICAL_EXPORT_TOKEN` (throw jeśli brak).
- Wymagać wyłącznie headera `Authorization: Bearer ...` zamiast query param.
- Dodać rate limiting.

---

### 1.3 [WYSOKIE] Middleware — brak weryfikacji sesji w DB

**Plik:** `middleware.ts:22-25`

Middleware weryfikuje tylko podpis JWT, nie sprawdza czy sesja istnieje w DB ani czy admin jest aktywny. Dezaktywowany admin zachowuje dostęp do panelu do 24h (czas życia JWT).

**Naprawa:** Akceptowalny kompromis, o ile `verifySession()` jest wywoływany w KAŻDYM Server Action i Route Handler (co jest spełnione).

---

### 1.4 [ŚREDNIE] Rate limiter in-memory — nieskuteczny na Vercel

**Plik:** `lib/rate-limit.ts`

Rate limiter używa `Map` w pamięci procesu. Na Vercel Serverless każde wywołanie może trafić na inną instancję — limity nie są współdzielone.

**Naprawa:** Wdrożyć `@upstash/ratelimit` z Redis lub użyć Vercel Firewall Rules.

---

### 1.5 [ŚREDNIE] Brak ochrony CSRF dla Route Handlerów API

**Pliki:** `app/api/auth/login/route.ts`, `app/api/reservations/route.ts`

Server Actions mają wbudowaną ochronę CSRF (header `Next-Action`). Route handlery API (`/api/...`) nie mają weryfikacji headera `Origin`/`Referer`.

**Naprawa:** Dodać weryfikację headera `Origin` w endpointach POST API.

---

### 1.6 [ŚREDNIE] CSP pozwala na `unsafe-inline` i `unsafe-eval`

**Plik:** `next.config.ts:32`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

`unsafe-eval` i `unsafe-inline` praktycznie nullifikują ochronę CSP przed XSS.

**Naprawa:** Usunąć `unsafe-eval` (Next.js w produkcji go nie wymaga). Zamienić `unsafe-inline` na nonce-based CSP.

---

### 1.7 [ŚREDNIE] Endpoint `/api/reservations/availability` — brak rate limitingu

**Plik:** `app/api/reservations/availability/route.ts`

Publiczny endpoint bez rate limitingu. Umożliwia masowe skanowanie kalendarza i obciążenie bazy.

**Naprawa:** Dodać `checkRateLimit()` analogicznie do `/api/reservations` POST.

---

### 1.8 [ŚREDNIE] Brak walidacji `guestName` przed wstawieniem do iCal/CSV

**Pliki:** `app/api/ical/export/route.ts`, `lib/validations.ts`

`guestName` jest walidowane jako `string().min(2)` — brak limitu długości i filtrowania znaków specjalnych. `escapeIcal()` nie escapuje `\r` (iCal injection).

**Naprawa:** Dodać `.max(100)` i `.regex()` do `guestName`. W `escapeIcal()` dodać escapowanie `\r` i znaków kontrolnych.

---

### 1.9 [ŚREDNIE] `postMessage(..., '*')` zamiast origin

**Plik:** `app/admin/content/miejsca/MiejscaEditor.tsx:68`

`iframe.contentWindow.postMessage({...}, '*')` — wysyłanie wiadomości z origin `'*'` jest ryzykowne. W `SectionEditor.tsx` poprawnie użyto `window.location.origin`.

**Naprawa:** Zmienić `'*'` na `window.location.origin`.

---

### 1.10 [ŚREDNIE] `execSync` w route handlerze

**Plik:** `app/api/admin/build-info/route.ts:6`

`execSync('git rev-parse...')` w route handlerze. Na Vercel nie ma gita (fallback na env vars), więc jest zbędny.

**Naprawa:** Usunąć `execSync` i polegać wyłącznie na `process.env.VERCEL_*`.

---

### 1.11 [NISKIE] Brak `.max()` na polach walidacyjnych

**Plik:** `lib/validations.ts`

- `guestName: z.string().min(2)` — brak `.max()`.
- `guestPhone: z.string().min(9)` — brak `.max()` i regex.

**Naprawa:** `guestName: z.string().min(2).max(100)`, `guestPhone: z.string().min(9).max(20).regex(/^[\d\s+()-]+$/)`.

---

### 1.12 [NISKIE] Brak sanityzacji URL w `updateMailingLogoUrl`

**Plik:** `actions/mailing.ts:14-24`

Przyjmuje dowolny `url` i zapisuje go do bazy. Używany w `<img src=...>` w emailach.

**Naprawa:** Walidować, że URL zaczyna się od `https://` lub `/`.

---

### 1.13 [NISKIE] Sesja 7 dni bez możliwości unieważnienia wszystkich

**Plik:** `lib/auth.ts`

Brak funkcji "wyloguj ze wszystkich urządzeń".

**Naprawa:** Dodać Server Action `destroyAllSessions(adminId)`.

---

## 2. LOGIKA BIZNESOWA

### 2.1 [WYSOKIE] `getClients` — ładowanie WSZYSTKICH klientów przy sortowaniu

**Plik:** `actions/clients.ts:47-53`

Gdy `sortBy` to `reservationCount` lub `totalSpent`, zapytanie pobiera wszystkich klientów z bazy (bez `skip`/`take`) razem z rezerwacjami. Przy dużej liczbie klientów — ryzyko OOM.

**Naprawa:** Użyć raw SQL z `COUNT`/`SUM` jako subquery albo dodać kolumny denormalizowane.

---

### 2.2 [WYSOKIE] Brak walidacji danych w `updateClient`

**Plik:** `actions/clients.ts:137-156`

`updateClient` przyjmuje dowolne `data` i przekazuje je bezpośrednio do Prisma bez walidacji Zod. Można przekazać `rating: 999`, `discount: -50`.

**Naprawa:** Dodać schemat Zod.

---

### 2.3 [WYSOKIE] Brak walidacji inputu w `addAdminNote`

**Plik:** `actions/reservations.ts:194-204`

Nie waliduje długości `note`. Można wstawić dowolnie długi string.

**Naprawa:** Dodać `.max(2000)`.

---

### 2.4 [ŚREDNIE] iCal parser — brak obsługi line folding (RFC 5545)

**Plik:** `actions/ical.ts:36-65`

Parser nie obsługuje "line folding" (linie > 75 znaków zawijane ze spacjami/tabami) ani parametrów TZID.

**Naprawa:** Dodać: `const unfolded = icalText.replace(/\r?\n[ \t]/g, '');`

---

### 2.5 [ŚREDNIE] `[...slug]/page.tsx` — content renderowany jako plain text, nie HTML

**Plik:** `app/[...slug]/page.tsx:89-92`

Treść z bazy (WYSIWYG) jest renderowana przez `split('\n\n').map(p => <p>)` — jako plain text. W `HomeClient.tsx` ta sama treść jest renderowana przez `dangerouslySetInnerHTML` z sanityzacją.

**Naprawa:** Użyć `dangerouslySetInnerHTML` z `sanitizeHtml()`.

---

### 2.6 [ŚREDNIE] Brak autoryzacji w publicznych akcjach

**Pliki:** `actions/pages.ts:65-95`, `actions/seo.ts:6-33`

`getPageTree()`, `getSectionsForGraph()`, `getPageFlat()`, `getSeoSettings()`, `getGlobalSeo()` nie sprawdzają sesji. Ujawniają strukturę stron i dane SEO.

**Naprawa:** Jeśli celowe — OK. Jeśli nie — dodać `verifySession()`.

---

### 2.7 [NISKIE] Select gości z hardcoded max 6

**Plik:** `components/HomeClient.tsx:527-530`

Selector gości ma hardcoded `[1,2,3,4,5,6]`, ale `settings.maxGuests` może być inny.

**Naprawa:** Generować opcje na podstawie `settings.maxGuests`.

---

### 2.8 [NISKIE] `removeBlockedDate` nie obsługuje nieistniejącego ID

**Plik:** `actions/reservations.ts:244-249`

Prisma rzuci `RecordNotFound`. Brak obsługi.

**Naprawa:** Dodać `try/catch`.

---

### 2.9 [NISKIE] `[...slug]/page.tsx` — brak nawigacji powrotnej

Podstrony dynamiczne nie mają TopMenu ani nawigacji powrotnej na stronę główną.

---

## 3. WYDAJNOŚĆ

### 3.1 [KRYTYCZNE] Nodemailer transport tworzony przy każdym wywołaniu

**Plik:** `lib/mail.ts:11-27`

`getTransport()` tworzy nowy `nodemailer.createTransport()` przy każdym `sendEmail()`. Przy burscie — timeouty lub odmowa SMTP.

**Naprawa:** Użyć wzorca singleton (analogicznie do `prisma`):
```ts
const globalForMail = globalThis as unknown as { smtpTransport?: nodemailer.Transporter };
function getTransport() {
  if (globalForMail.smtpTransport) return globalForMail.smtpTransport;
  const transport = nodemailer.createTransport({...});
  globalForMail.smtpTransport = transport;
  return transport;
}
```

---

### 3.2 [WYSOKIE] Dashboard — 12 równoległych zapytań Prisma

**Plik:** `app/admin/dashboard/page.tsx:38-86`

Funkcja `getStats()` wykonuje 9 zapytań w `Promise.all`, potem 3 kolejne. Wiele z tych danych to te same rekordy z różnymi filtrami.

**Naprawa:** Zredukować do 3-4 zapytań:
- Jedno po rezerwacje z bieżącego roku.
- Jedno `groupBy` po statusach.
- Jedno po `blockedDates`.
- Jedno po `upcomingCheckIns` + alerty.

---

### 3.3 [ŚREDNIE] HomeClient — ogromny komponent (~950 linii) bez memoizacji

**Plik:** `components/HomeClient.tsx`

~950 linii, 10+ useState, 8+ useEffect. Funkcje renderujące wewnątrz komponentu tworzą nowe referencje przy każdym renderze. `calculatePrice` wywoływane przy każdym renderze.

**Naprawa:**
- Wydzielić `ReservationSystem` i `ExpandedContent` jako osobne `React.memo` komponenty.
- Owinąć `priceResult` w `useMemo`.
- Podzielić na mniejsze komponenty per sekcja.

---

### 3.4 [ŚREDNIE] Lightbox ładuje pełnorozmiarowe obrazy na mobile

**Plik:** `components/Lightbox.tsx:74`

Używa `current.src` (pełnorozmiarowy `webpUrl`) zamiast `mobileUrl` na urządzeniach mobilnych.

**Naprawa:** Użyć responsywnego `sizes` lub warunkowego src.

---

### 3.5 [ŚREDNIE] GalleryManager — brak limitu jednoczesnych uploadów

**Plik:** `app/admin/gallery/GalleryManager.tsx:65`

Brak limitu plików. 100 plików = 100 konwersji sharp + 400 uploadów do Vercel Blob jednocześnie.

**Naprawa:** Limit 10 plików i/lub przetwarzanie w batchach po 3.

---

### 3.6 [ŚREDNIE] `updateImageOrder` — N operacji w transakcji

**Plik:** `actions/gallery.ts:83-94`

N osobnych `update` w `$transaction`. Przy 100+ zdjęciach = 100+ zapytań.

**Naprawa:** Użyć raw SQL z `CASE WHEN` w jednym UPDATE.

---

### 3.7 [ŚREDNIE] Brak `next/dynamic` dla ciężkich komponentów

**Pliki:** `SiteStructureGraph.tsx` (@xyflow/react), `RichTextEditor.tsx` (tiptap), `CalendarView.tsx`

Ciężkie biblioteki ładowane synchronicznie. Powinny być ładowane dynamicznie.

**Naprawa:** `const SiteStructureGraph = dynamic(() => import(...), { loading: () => <Spinner /> })`.

---

### 3.8 [NISKIE] `today` w HomeClient nie odświeży się o północy

**Plik:** `components/HomeClient.tsx:153`

```tsx
const today = useRef(new Date()).current;
```

Jeśli użytkownik trzyma kartę otwartą przez noc, `minDate` w DatePicker się nie zaktualizuje.

---

### 3.9 [NISKIE] `getSettings()` — `cache()` nie działa w Server Actions

**Plik:** `actions/settings.ts:80`

`cache()` z Reacta działa tylko w kontekście renderowania Server Components. W server action/route handler nie deduplikuje.

---

## 4. OPTYMALIZACJA OBRAZÓW

### 4.1 Status: Poprawnie zaimplementowana

**Plik:** `lib/uploads.ts`

System używa `sharp` do generowania 4 wariantów każdego obrazu (desktop webp, mobile webp, thumb, original). Obrazy są uploadowane do Vercel Blob. Frontend korzysta z `next/image` w większości miejsc.

**Drobne uwagi:**
- Hero/logo używają `<img>` zamiast `next/image` (SVG — akceptowalne).
- Lightbox na mobile ładuje pełnorozmiarowe obrazy (patrz 3.4).
- Publiczne pliki w `/public/assets/` są w formacie WebP — poprawnie.

---

## 5. DUPLIKACJA KODU

### 5.1 [WYSOKIE] `formatPLN()` — zduplikowana w 3 plikach

**Pliki:**
- `app/admin/reports/ReportsClient.tsx:14`
- `app/admin/clients/ClientsClient.tsx:26`
- `app/admin/clients/[id]/ClientDetail.tsx:58`

**Naprawa:** Wyciągnąć do `lib/format.ts`.

---

### 5.2 [WYSOKIE] `overlapNights()` — zduplikowana w 2 plikach

**Pliki:**
- `actions/reports.ts:12-17`
- `app/admin/dashboard/page.tsx:20-25`

**Naprawa:** Wyciągnąć do `lib/date-utils.ts`.

---

### 5.3 [ŚREDNIE] `STATUS_CONFIG` — zduplikowane w 4+ plikach (pogorszone po zmianach)

**Pliki:** `ReservationsClient.tsx`, `[id]/page.tsx`, `ReservationActions.tsx` (2x: `STATUS_OPTIONS` + `STATUS_BADGE_CLASS`), `CalendarView.tsx`, `ClientDetail.tsx`

Najnowsze zmiany dodały identyczne mapy kolorów CSS (`bg-amber-500/20 text-amber-400 border-amber-500/30` itd.) w **co najmniej 4 plikach**. W `ReservationActions.tsx` powstały aż 3 równoległe struktury: `STATUS_OPTIONS` (z `color` i `activeClass`), `STATUS_LABELS`, i `STATUS_BADGE_CLASS`. To zwiększa ryzyko rozbieżności.

**Naprawa:** Pilne — wyciągnąć do `lib/reservation-status.ts` jedną wspólną mapę z polami `label`, `badgeClass`, `color`, `activeClass`.

---

### 5.4 [ŚREDNIE] `SECTION_ICONS` — 2 niezgodne wersje

**Pliki:** `lib/section-icons.ts` (Lucide), `SiteStructureGraph.tsx:22` (emoji)

**Naprawa:** Ujednolicić — dodać pole `emoji` do `lib/section-icons.ts`.

---

### 5.5 [NISKIE] Typ `GalleryItem` — powtórzony w 3 plikach

**Pliki:** `SectionGalleryEditor.tsx`, `SectionEditor.tsx`, `MiejscaEditor.tsx`

**Naprawa:** Wyciągnąć do `types/gallery.ts`.

---

## 6. KONFIGURACJA I JAKOŚĆ

### 6.1 [ŚREDNIE] `prisma` w dependencies zamiast devDependencies

**Plik:** `package.json`

Prisma CLI jest potrzebna tylko podczas budowania/migracji, nie w runtime.

**Naprawa:** Przenieść do devDependencies (skrypt `postinstall` nadal go znajdzie).

---

### 6.2 [ŚREDNIE] Prisma schema — `tags` jako String zamiast Json

**Plik:** `prisma/schema.prisma`

`Section.tags` i `Client.tags` to `String @default("[]")` — przechowywanie JSON w stringu. Niespójne z `contentPl`/`contentEn` które są `Json`.

**Naprawa:** Zmienić na typ `Json`.

---

### 6.3 [ŚREDNIE] Brak indeksu `Page.parentId`

**Plik:** `prisma/schema.prisma`

Zapytania o dzieci strony będą wolniejsze bez indeksu.

**Naprawa:** Dodać `@@index([parentId])`.

---

### 6.4 [ŚREDNIE] `globals.css` — 2405 linii monolityczny plik

**Plik:** `app/globals.css`

Brak metodologii nazewnictwa, dużo powtarzających się `clamp()` i media queries. Potencjalne konflikty specyficzności.

**Naprawa:** Rozważyć podział na mniejsze pliki per sekcja.

---

### 6.5 [ŚREDNIE] `JsonLd` — hardkodowane dane

**Plik:** `components/JsonLd.tsx`

Schema.org `LodgingBusiness` ma hardkodowane wartości (pusty `telephone`). Powinien ciągać dane z `SiteSettings`.

**Naprawa:** Pobierać dane z bazy.

---

### 6.6 ✅ [ŚREDNIE] `index.html` i `style.css` — relikty w repo — NAPRAWIONE

Pliki zostały usunięte z repo.

---

### 6.7 [NISKIE] Nieużywane zależności w `package.json`

- `concurrently` — brak w żadnym skrypcie npm.
- `@types/sharp` — Sharp 0.33+ ma wbudowane typy.
- `shadcn` — narzędzie CLI, można przenieść do devDependencies.

---

### 6.8 [NISKIE] `tsconfig.json` — brak `noUncheckedIndexedAccess`

Warto dodać dla lepszego bezpieczeństwa typów.

---

### 6.9 [NISKIE] `lib/i18n.ts` — `.ts` zamiast `.tsx`

Używa `createElement` zamiast JSX. Zmiana rozszerzenia na `.tsx` poprawi czytelność.

---

### 6.10 [NISKIE] `not-found.tsx` — brak metadata, tylko po polsku

Strona 404 nie eksportuje `metadata` i jest hardkodowana po polsku.

---

### 6.11 [NISKIE] Sitemap bez hreflang

Sitemap nie generuje alternatywnych URL-i dla wersji EN.

---

## 7. NOWE UWAGI (po zmianach kodu)

### 7.1 [ŚREDNIE] `BlockedDate.type` — brak walidacji w `addBlockedDate`

**Plik:** `actions/reservations.ts:224`

Nowy parametr `type: 'BLOCKED' | 'SERVICE'` jest dodany do sygnatury, ale nie jest walidowany przez Zod — klient może przekazać dowolny string. W Prisma schema typ to `String @default("BLOCKED")` bez constraintów.

**Naprawa:** Dodać walidację `z.enum(['BLOCKED', 'SERVICE'])` lub użyć enum w Prisma.

---

### 7.2 [ŚREDNIE] `CalendarView` — zmiana logiki `getReservationsForDay` może powodować off-by-one

**Plik:** `app/admin/calendar/CalendarView.tsx:80-83`

Zmieniono z `end: new Date(checkOut.getTime() - 86400000)` na `end: checkOut` (bez odejmowania dnia). To może powodować wyświetlanie rezerwacji w dniu checkout-u jako "zajęty", co jest niespójne z logiką rezerwacji (checkout = dzień wyjazdu, nie nocleg).

**Naprawa:** Zweryfikować czy checkout powinien być wyświetlany w kalendarzu jako zajęty dzień. Standardowo checkout = gość wyjeżdża, więc ten dzień jest wolny.

---

### 7.3 [NISKIE] Dashboard `StatCard` — usunięto warianty kolorystyczne

**Plik:** `app/admin/dashboard/page.tsx`

Usunięto `variant` z `StatCard` i Badge — teraz wszystkie karty wyglądają identycznie. Utracono wizualne rozróżnienie oczekujących/anulowanych rezerwacji.

**Naprawa:** Rozważyć przywrócenie subtelnego kolorystycznego rozróżnienia (np. kolorowa obwódka lub ikona) dla kluczowych stanów.

---

## 8. PRIORYTETOWY PLAN NAPRAW

### Natychmiast (dzień 1)
1. Zrotować wszystkie sekrety z `.env`, przenieść do Vercel env vars.
2. Ustawić `ICAL_EXPORT_TOKEN` jako wymagany, wyłączyć query param fallback.
3. Naprawić `postMessage(..., '*')` → `window.location.origin`.

### Pilne (tydzień 1)
4. Singleton na SMTP transport (`lib/mail.ts`).
5. Dodać walidację Zod w `updateClient`, `addAdminNote`, `addBlockedDate`.
6. Dodać `.max()` i regex do pól walidacyjnych.
7. **Wyciągnąć duplikaty: `formatPLN`, `overlapNights`, `STATUS_CONFIG`** — pilniejsze po zmianach (STATUS_CONFIG teraz w 4+ plikach).
8. Naprawić renderowanie HTML w `[...slug]/page.tsx`.

### Ważne (tydzień 2-3)
9. Wdrożyć Upstash rate limiting.
10. Zoptymalizować zapytania dashboardu (12 → 3-4).
11. Dodać paginację w `getClients` dla computed sort.
12. Usunąć `unsafe-eval` z CSP.
13. Dodać `next/dynamic` dla ciężkich komponentów.
14. Dodać indeks `Page.parentId` w Prisma.
15. Zweryfikować logikę `getReservationsForDay` po zmianie (off-by-one w checkout).

### Ulepszenia (backlog)
16. Podzielić `HomeClient.tsx` na mniejsze komponenty.
17. Podzielić `globals.css` na mniejsze pliki.
18. Zmienić `tags` na typ `Json` w Prisma.
19. Dynamiczne dane w `JsonLd`.
20. ~~Usunąć relikty (`index.html`, `style.css`).~~ ✅ Naprawione.
21. Posprzątać nieużywane zależności.
