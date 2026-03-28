# Raport analizy kodu - HOMMM (Maja Site)

**Data:** 2026-03-29
**Zakres:** Pełna analiza kodu pod katem logiki, wydajnosci, bezpieczenstwa, optymalizacji i jakosci kodu.
**Ostatni commit:** `ce89b3e` — admin dashboard, pricing rules, calendar, reservations management.

---

## Podsumowanie

| Kategoria | Krytyczne | Wysokie | Srednie | Niskie |
|-----------|-----------|---------|---------|--------|
| Logika / Bugi | 1 | 1 | 2 | - |
| Bezpieczenstwo | - | 3 | 2 | - |
| Wydajnosc | - | 1 | 6 | 3 |
| Jakosc kodu / DRY | - | 2 | 5 | 3 |
| Optymalizacja obrazow/assets | - | - | 1 | - |
| **Razem** | **1** | **7** | **16** | **6** |

---

## 1. KRYTYCZNE

### 1.1 Bug w logice priorytetow cenowych (lib/pricing.ts:82-94)

**Problem:** Cena weekendowa nadpisuje cene sezonowa zamiast stosowac hierarchie priorytetow.

```typescript
// Obecny kod:
let price = settings.pricePerNight;
if (highSeason && settings.priceSeasonHigh > 0) {
  price = settings.priceSeasonHigh;
} else if (!highSeason && settings.priceSeasonLow > 0) {
  price = settings.priceSeasonLow;
}
// BUG: weekend ZAWSZE nadpisuje sezon!
if (isWeekendNight(current) && settings.priceWeekend > 0) {
  price = settings.priceWeekend;
}
```

**Efekt:** Jesli weekend wypada w sezonie wysokim (np. cena sezonowa 400 zl, weekendowa 300 zl), cena spada do 300 zl zamiast pozostac na 400 zl.

**Sugestia:** Uzyc `Math.max(price, settings.priceWeekend)` lub okreslic jawna hierarchie: reguly dat > sezon > weekend > baza.

---

## 2. WYSOKIE

### 2.1 Zduplikowana stala DELETABLE_STATUSES

**Pliki:**
- `actions/reservations.ts:332` — `const DELETABLE_STATUSES = ['CANCELLED', 'PENDING', 'DEPOSIT_PAID', 'PAID']`
- `app/admin/reservations/ReservationsClient.tsx:24` — identyczna kopia

**Problem:** Jesli polityka usuwania rezerwacji sie zmieni, trzeba pamietac o aktualizacji w dwoch miejscach.

**Sugestia:** Wyeksportowac z `lib/reservation-status.ts` (tam juz sa `CONFIRMED_STATUSES`).

### 2.2 Niespojny wzorzec autoryzacji w server actions

**Pliki:**
- `actions/reservations.ts:38` — uzywa helpera `unauthorized()`
- `actions/pricing.ts:68` — inline `{ error: 'Brak autoryzacji' }`
- `actions/settings.ts:116` — inline `{ error: 'Brak autoryzacji' }`
- `actions/gallery.ts`, `actions/content.ts` — rozne wzorce

**Problem:** Niespojne odpowiedzi bledow utrudniaja obsluge po stronie klienta.

**Sugestia:** Ujednolicic na `unauthorized()` z `lib/auth.ts` we wszystkich actions.

### 2.3 CSP pozwala na unsafe-eval i unsafe-inline (next.config.ts:34-43)

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://use.typekit.net https://cloud.umami.is"
```

**Problem:** `unsafe-eval` i `unsafe-inline` uniewaznaja ochrone CSP przed XSS. Na produkcji to powazne ryzyko.

**Sugestia:** Uzyc nonce-based CSP lub usunac `unsafe-eval` (czesto potrzebne tylko w dev).

### 2.4 Rate limiting dziala tylko w pamieci (lib/rate-limit.ts)

**Problem:** In-memory rate limiter nie dziala w srodowisku wieloinstancyjnym (Vercel Functions). Kazda instancja ma wlasny licznik.

**Sugestia:** Uzyc Upstash Redis rate limiter (`@upstash/ratelimit`) dla pelnej ochrony.

### 2.5 Middleware waliduje tylko JWT, nie sprawdza sesji w DB (middleware.ts:22-32)

**Problem:** Jesli admin zostanie dezaktywowany, moze dalej korzystac z panelu do wygasniecia JWT (24h). Middleware sprawdza jedynie podpis JWT.

**Sugestia:** Dodac krotszy czas zycia JWT (np. 1h) lub cache'owac status admina w Redis.

---

## 3. BEZPIECZENSTWO (srednie)

### 3.1 Brak ochrony CSRF w logowaniu (app/api/auth/login/route.ts)

**Problem:** Brak walidacji tokenu CSRF. Formularz logowania moze byc podatny na ataki CSRF z obcych domen.

**Sugestia:** Dodac CSRF token lub uzyc biblioteki (np. `csrf-token`).

### 3.2 Ciche polykanie bledow przy wysylce emaili

**Pliki:**
- `actions/reservations.ts:133-137`
- `app/api/reservations/route.ts:139-148`

```typescript
sendEmail({ to: updated.guestEmail, ...emailContent }).catch(() => {});
```

**Problem:** Jesli email nie zostanie wyslany, nikt sie nie dowie. Brak logowania, brak retry.

**Sugestia:** Dodac `console.error` w `catch` i rozwazyc kolejke retry (np. Vercel Queues).

---

## 4. LOGIKA I POPRAWNOSC

### 4.1 Porownywanie dat w zapytaniach o nakladanie sie rezerwacji

**Pliki:** `app/api/reservations/route.ts:68-74`, `actions/reservations.ts:170-180`

Zmiana z `lt/gt` na `lte/gte` w ostatnim commicie jest poprawna koncepcyjnie (inclusywne granice), ale wymaga weryfikacji semantyki `checkOut`:
- Jesli `checkOut` to dzien wyjazdu (gosc NIE nocuje tego dnia) — `lte/gte` moze powodowac falszywwe konflikty (gosc A wyjedza 15-go, gosc B zameldowuje sie 15-go — to NIE jest konflikt, ale query go wykryje).

**Sugestia:** Zweryfikowac semantyke `checkOut` w calym systemie i udokumentowac konwencje.

### 4.2 Przyklad zaliczki w PricingClient jest bledny (PricingClient.tsx:573)

```typescript
{settings.depositPercent > 0 && ` Np. przy cenie 1000 zl zaliczka wyniesie ${settings.depositPercent * 10} zl.`}
```

**Problem:** `depositPercent * 10` to uproszczenie, ktore jest poprawne TYLKO dla ceny 1000 zl. Lepiej uzyc `1000 * settings.depositPercent / 100`.

---

## 5. WYDAJNOSC

### 5.1 Dashboard force-dynamic bez cache (app/admin/dashboard/page.tsx)

**Problem:** `export const dynamic = 'force-dynamic'` powoduje, ze kazde wejscie na dashboard = cold hit do bazy. Zapytania pobieraja rezerwacje z 2 lat ze WSZYSTKIMI polami (15+ kolumn).

**Sugestia:**
- Dodac `select` z tylko potrzebnymi polami (`checkIn, checkOut, nights, totalPrice, status`)
- Rozwazyc `revalidate: 60` zamiast `force-dynamic`

### 5.2 getReservations pobiera wszystkie pola (actions/reservations.ts:55-62)

**Problem:** `findMany` bez `select` pobiera wszystkie kolumny. Dla tabeli potrzeba tylko 7-8 pol.

**Sugestia:** Dodac `select: { id, guestName, guestEmail, checkIn, checkOut, status, totalPrice, nights, guests, comment, createdAt }`.

### 5.3 Sekwencyjne zapytania DB w updateReservation (actions/reservations.ts:152-169)

**Problem:** `findUnique` (linia 152) i `findFirst` dla overlap check (linia 169) wykonywane sekwencyjnie.

**Sugestia:** Uzyc `Promise.all` lub przeniesc overlap check do transakcji.

### 5.4 Sanityzacja HTML — cache uniewazniane przy kazdym renderze (HomeClient.tsx:118-128)

```typescript
const memoSanitize = useMemo(() => { ... }, [sections, locale]);
```

**Problem:** `sections` jest nowym obiektem przy kazdym renderze (derivowany z `initialSections` + `liveOverrides`), wiec cache sie resetuje.

**Sugestia:** Usunac `sections` z tablicy zaleznosci — cache powinien byc niezalezny od danych wejsciowych (`[]`).

### 5.5 Brak useCallback na inline functions w HomeClient (HomeClient.tsx:171, 191, 200)

**Problem:** Funkcje `c()`, `r()`, `getNightLabel()` sa tworzone na nowo przy kazdym renderze, co uniewazniane memoizacje komponentow potomnych.

**Sugestia:** Uzyc `useCallback` z prawidlowymi zaleznosciami.

### 5.6 useRef(new Date()) tworzy nowy obiekt przy kazdym renderze (HomeClient.tsx:168)

```typescript
const today = useRef(new Date()).current;
```

**Problem:** `new Date()` jest ewaluowane przy kazdym renderze, mimo ze `useRef` zachowuje tylko pierwsza wartosc.

**Sugestia:** `useMemo(() => new Date(), [])`.

### 5.7 Cron export laduje 500 pelnych rezerwacji (app/api/cron/export/route.ts:16-20)

**Problem:** Pobiera 500 rezerwacji ze WSZYSTKIMI polami do pamieci, potem serializuje do JSON.

**Sugestia:** Dodac `select` z potrzebnymi polami.

### 5.8 SMTP transport cache'owany bez health-check (lib/mail.ts:13-35)

**Problem:** Jesli serwer SMTP padnie, polaczenie nigdy nie jest odnawiane. Transport jest cache'owany globalnie.

**Sugestia:** Dodac `transport.verify()` przed wysylka lub implementowac exponential backoff.

### 5.9 CSS globalny — 2389 linii w jednym pliku (app/globals.css)

**Problem:** Caly CSS ladowany na kazdej stronie. Import CSS react-datepicker globalnie, nawet jesli komponent nie jest uzywany.

**Sugestia:** Przeniesc CSS react-datepicker do komponentu, ktory go uzywa. Rozwazyc CSS modules dla specyficznych stron.

---

## 6. JAKOSC KODU / DRY

### 6.1 Niespojne formatowanie dat

Trzy rozne wzorce formatowania dat w kodzie:
- `toISOString().split('T')[0]` — actions/pricing.ts
- `toLocaleDateString('pl-PL', ...)` — PricingClient.tsx
- `format(date, 'dd.MM.yyyy')` (date-fns) — actions/reservations.ts

**Sugestia:** Stworzyc helper w `lib/date-utils.ts`: `toDateString(date)` i `toDisplayDate(date, locale)`.

### 6.2 Niespojne wyciaganie bledow Zod

- `actions/pricing.ts:71` — `parsed.error.issues[0].message`
- `actions/reservations.ts:150` — `parsed.error.issues[0]?.message ?? 'Nieprawidlowe dane'`
- `app/api/reservations/route.ts:35` — `parsed.error.flatten().fieldErrors`

**Sugestia:** Stworzyc helper `extractZodError(parsed)`.

### 6.3 Zduplikowana walidacja telefonu

- `lib/validations.ts:15` — `/^[\d\s+()-]+$/`
- `components/ReservationModal.tsx:49` — `/^\+?[\d\s\-()]{9,15}$/`

**Problem:** Dwa rozne regexy dla tego samego celu. Moga dawac rozne wyniki.

**Sugestia:** Uzyc jednego regexa, wyeksportowanego z `lib/validations.ts`.

### 6.4 Reczne sprawdzanie typow w getSettings (actions/settings.ts:82-112)

```typescript
pricePerNight: typeof map.pricePerNight === 'number' ? map.pricePerNight : DEFAULTS.pricePerNight,
// ... 15+ kolejnych recznych sprawdzen
```

**Problem:** Duplikuje logike walidacji z `settingsSchema` (Zod). Podatne na bledy przy dodawaniu nowych pol.

**Sugestia:** Uzyc `settingsSchema.safeParse({ ...DEFAULTS, ...map })`.

### 6.5 Duplikacja wzorca CRUD w actions

Kazdy plik action reimplementuje ten sam wzorzec: `verifySession()` → `safeParse()` → operacja DB → `{ success/error }`.

**Pliki:** `actions/pricing.ts`, `actions/reservations.ts`, `actions/settings.ts`, `actions/clients.ts`, `actions/pages.ts`

**Sugestia:** Rozwazyc helper `withAuth(schema, handler)`, ale NIE overengineer'owac — obecny stan jest czytelny i KISS.

### 6.6 Zbyt wiele useState w HomeClient (HomeClient.tsx:62-145)

10+ stanow w jednym komponencie. Zlozony lancuch zaleznosci miedzy stanami.

**Sugestia:** Rozwazyc `useReducer` dla powiazanych stanow (np. stany rezerwacji) lub wydzielic mniejsze komponenty.

### 6.7 Parameter sprawl w ReservationModal (ReservationModal.tsx:7-19)

Komponent przyjmuje 10 indywidualnych propsow zamiast obiektu.

**Sugestia:** Zgrupowac w `reservation: { checkIn, checkOut, nights, guests, totalPrice, depositAmount }`.

---

## 7. OPTYMALIZACJA OBRAZOW I ASSETOW

### 7.1 Konfiguracja next/image — brak formatu fallback

**Plik:** `next.config.ts:61`

```typescript
formats: ['image/avif', 'image/webp'],
```

**Status:** Obrazy w `public/` sa w formacie WebP — **poprawnie**.
Konfiguracja `remotePatterns` dla Vercel Blob — **poprawnie**.
`deviceSizes` i `imageSizes` — **poprawnie** skonfigurowane.
Hero image preload z `fetchPriority="high"` — **poprawnie** (`app/layout.tsx:76-83`).

**Uwaga:** Next.js automatycznie obsluguje fallback (JPEG/PNG), wiec brak jawnego formatu fallback w konfiguracji nie jest problemem.

**Wniosek:** Optymalizacja obrazow dziala prawidlowo. Brak problemow.

### 7.2 Bundle analyzer skonfigurowany, ale nieuzywany

**Plik:** `next.config.ts:2-6`

`withBundleAnalyzer` jest skonfigurowany. Warto okresowo uruchamiac `ANALYZE=true npm run build` aby wykrywac nadmierny rozmiar bundla.

---

## 8. SUGESTIE DODATKOWE (niski priorytet)

### 8.1 Dostepnosc danych o dostepnosci terminow

Dane o zajetych terminach pobierane sa client-side (`fetchAvailability` w HomeClient). Mozna je wstepnie zaladowac server-side i przekazac jako prop.

### 8.2 Reusable StatsCard

Wzorzec karty statystyk powtarza sie w ReservationsClient, ClientsClient, Dashboard. Mozna wydzielic `<StatsCard label value />`.

### 8.3 Podwojne sprawdzanie JWT

JWT jest weryfikowany w middleware (middleware.ts:24), a potem ponownie w `verifySession()` w kazdym server action. To podwojne sprawdzenie jest nadmiarowe, ale nie szkodliwe.

---

## 9. CO DZIALA DOBRZE

- **Architektura**: Czyste rozdzielenie server actions / API routes / komponenty klienckie.
- **Walidacja Zod**: Uzywana konsekwentnie na granicach systemowych.
- **Optymalizacja obrazow**: WebP, proper next/image, preload hero.
- **Lazy loading**: Lightbox i DatePicker ladowane dynamicznie.
- **Parallel data fetching**: `Promise.all` uzywany w wiekszosci stron serwerowych.
- **Prisma**: Transakcje uzywane przy tworzeniu rezerwacji (zapobieganie race conditions).
- **ISR**: Strona glowna uzywa `revalidate: 60`.
- **Sanityzacja HTML**: `sanitizeHtml` uzywany przy renderowaniu user-generated content.
- **Event listener cleanup**: Prawidlowe czyszczenie w useEffect.

---

## 10. PRIORYTETY NAPRAW

### Natychmiastowe (przed wdrozeniem)
1. **Bug cenowy** (1.1) — weekendowa cena nadpisuje sezonowa
2. **Weryfikacja semantyki checkOut** (4.1) — lte/gte moze powodowac false conflicts

### Wysokie (w najblizszym sprincie)
3. Wyeksportowac DELETABLE_STATUSES do wspolnego pliku (2.1)
4. Ujednolicic wzorzec autoryzacji (2.2)
5. Poprawic CSP — usunac unsafe-eval na produkcji (2.3)
6. Wdrozyc rozproszony rate limiting (2.4)

### Srednie (planowane)
7. Dodac `select` do zapytan dashboardowych (5.1, 5.2)
8. Naprawic cache sanityzacji HTML (5.4)
9. Ujednolicic formatowanie dat (6.1)
10. Ujednolicic obsluge bledow Zod (6.2)

### Niskie (backlog)
11. Wydzielic StatsCard (8.2)
12. Uzyc useReducer w HomeClient (6.6)
13. Zgrupowac propsy ReservationModal (6.7)
14. Dodac tooltipy do pol formularzy w panelu admina (11)
15. Dodac symulator ceny do zakladki Cennik (12)

---

## 11. TOOLTIPY — POLA WYMAGAJACE POMOCY KONTEKSTOWEJ

Ponizej lista pol formularzy w panelu admina, ktore wymagaja tooltipow (ikonka `?` lub `info` z podpowiedzią po najechaniu). Pogrupowane wg sekcji.

### 11.1 Cennik (`app/admin/pricing/PricingClient.tsx`)

#### Cennik bazowy (linie 157-185)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Cena za noc (PLN) | 162 | Brak | "Podstawowa cena za jedną noc. Może być nadpisana przez cenę weekendową, sezonową lub regułę z cennika dat." |
| Cena weekendowa (PLN) | 173 | "(0 = brak)" | "Cena obowiązująca w noce piątek→sobota i sobota→niedziela. Nadpisuje cenę bazową i sezonową. Ustaw 0 aby wyłączyć." |

#### Cennik sezonowy (linie 187-239)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Cena — sezon wysoki (PLN) | 194 | Brak | "Cena w okresie sezonu wysokiego (daty poniżej). Nadpisuje cenę bazową. Ustaw 0 aby wyłączyć." |
| Cena — sezon niski (PLN) | 206 | Brak | "Cena poza sezonem wysokim. Nadpisuje cenę bazową. Ustaw 0 aby wyłączyć." |
| Sezon wysoki od (MM-DD) | 220 | Placeholder "06-01" | "Data początkowa sezonu w formacie MM-DD. Np. 06-01 = 1 czerwca. Obsługuje przełom roku (np. 11-01 do 03-31)." |
| Sezon wysoki do (MM-DD) | 230 | Placeholder "09-30" | "Data końcowa sezonu w formacie MM-DD. Jeśli 'od' > 'do', system rozumie to jako okres przez zmianę roku." |

#### Rabat za długi pobyt (linie 241-270)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Rabat (%) | 247 | Brak | "Procent rabatu od całkowitej ceny rezerwacji. Aktywuje się gdy liczba nocy >= próg poniżej." |
| Próg (noce) | 259 | Brak | "Minimalna liczba nocy do aktywacji rabatu. Np. 7 = rabat od tygodnia wzwyż." |

#### Zaliczka (linie 272-293)

| Pole | Linia | Obecna pomoc | Opis obecnej pomocy / Sugerowany tooltip |
|------|-------|--------------|------------------------------------------|
| Wysokość (%) | 278 | Obliczony przykład | "Procent ceny rezerwacji wymagany jako zaliczka. Obliczany od ceny PO rabacie. Ustaw 0 aby wyłączyć." |

#### Cennik dat — formularz reguł (linie 303-370)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Nagłówek sekcji | 306 | Opis pod tytułem | "Reguły z cennika dat mają NAJWYŻSZY priorytet — nadpisują cenę bazową, weekendową i sezonową." |
| Nazwa | 333 | Brak | "Wewnętrzna nazwa reguły (np. 'Wakacje 2026', 'Sylwester'). Widoczna tylko w panelu." |
| Cena za noc (zł) | 341 | Brak | "Cena noclegowa w tym przedziale dat. Nadpisuje WSZYSTKIE inne ceny (bazową, weekendową, sezonową)." |
| Od | 352 | Brak | "Pierwszy dzień obowiązywania reguły (włącznie)." |
| Do | 360 | Brak | "Ostatni dzień obowiązywania reguły (włącznie)." |

### 11.2 Ustawienia (`app/admin/settings/client.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Max. liczba gości | 77 | Brak | "Limit osób na jedną rezerwację. Formularz rezerwacji nie pozwoli przekroczyć tej wartości." |
| Min. liczba nocy | 88 | Brak | "Minimalna długość pobytu. Np. 2 = nie można zarezerwować na jedną noc." |
| Instagram/Facebook/TikTok URL | 127-146 | Placeholders | "Pełny URL profilu. Pojawi się jako ikona w stopce strony." |
| Nazwa firmy | 161 | Brak | "Oficjalna nazwa firmy. Widoczna w emailach i meta tagach." |
| NIP | 179 | Brak | "NIP do faktur. Może być pusty dla osób fizycznych." |

### 11.3 SEO (`app/admin/seo/SeoForm.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Tytuł (PL/EN) | 78-85 | Licznik znaków | "Nagłówek strony w Google (max ~60 znaków). Powinien zawierać słowa kluczowe." |
| Opis (PL/EN) | 95-104 | Licznik znaków | "Opis pod tytułem w Google (max ~160 znaków). Zachęcający do kliknięcia." |
| OG Image URL | 129 | Brak | "URL obrazka przy udostępnianiu na social media. Min. 1200x630px." |
| Custom head tags | 136 | Brak | "Dodatkowy HTML w <head>. Dla zaawansowanych: skrypty analityczne, custom meta tagi." |
| Reguły robots.txt dla AI | 155 | Opis ogólny | "Kontroluj dostęp botów AI (ChatGPT, Claude). Allow/Disallow dla konkretnych crawlerów." |
| llms.txt | 177 | Opis ogólny | "Opis obiektu czytelny dla AI. Skanowany przez modele językowe." |

### 11.4 Mailing (`app/admin/mailing/MailingEditor.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Logo w mailach | 131 | Brak | "Logo na górze emaili do gości. PNG/WebP, do 200px szerokości." |
| Treść (HTML) | 194 | Brak | "HTML body emaila. Użyj zmiennych {{guestName}}, {{totalPrice}} itp. do dynamicznych danych." |

### 11.5 Galeria (`app/admin/gallery/GalleryManager.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Alt text (PL/EN) | 320-331 | Placeholders | "Opis obrazka dla SEO i dostępności. Opisz co widać na zdjęciu (do 125 znaków)." |
| Sekcja | 341 | Brak | "Przypisz do sekcji strony. Puste = galeria główna." |

### 11.6 iCal (`app/admin/settings/ICalManager.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Link do eksportu | 91 | Opis ogólny | "Wklej w Booking.com/Airbnb aby zsynchronizować kalendarz." |
| Nazwa feedu | 159 | Placeholder | "Etykieta źródła (np. 'Booking.com', 'Airbnb'). Dla Twojej identyfikacji." |
| URL kalendarza iCal | 160 | Placeholder | "URL feedu iCal z Booking/Airbnb. Znajdź w ustawieniach kalendarza danego portalu." |

### 11.7 Edytor treści (`app/admin/content/[slug]/SectionEditor.tsx`)

| Pole | Linia | Obecna pomoc | Sugerowany tooltip |
|------|-------|--------------|-------------------|
| Obraz tła (URL) | 334 | Placeholder | "URL tła sekcji. Użyj przycisku 'Galeria' lub wklej zewnętrzny URL. Min. 1920x1080px." |
| Kolor tła | 398 | Brak | "Kolor tła gdy brak obrazu. Format hex (#RRGGBB) np. #1a1a1a." |

---

## 12. SYMULATOR CENY — PROPOZYCJA FUNKCJONALNOSCI

### 12.1 Cel

Dodac do zakladki **Cennik** (`app/admin/pricing/PricingClient.tsx`) interaktywny symulator ceny, ktory pozwala adminowi:
- Sprawdzic koncowa cene rezerwacji dla dowolnych dat
- Zweryfikowac poprawnosc konfiguracji cenowej
- Zobaczyc jak poszczegolne reguly wplywaja na cene

### 12.2 Interfejs

Symulator powinien byc umieszczony **na dole strony cennika** jako osobna sekcja (Card).

**Pola wejsciowe:**
- Data zameldowania (date picker)
- Data wymeldowania (date picker)

**Wynik — rozbicie ceny (tabela):**

| Noc | Data | Dzień tyg. | Sezon | Weekend | Reguła dat | Cena noclegu |
|-----|------|-----------|-------|---------|-----------|-------------|
| 1 | 2026-07-05 | Pt | Wysoki | Tak | — | 350 zł (weekendowa) |
| 2 | 2026-07-06 | So | Wysoki | Tak | — | 350 zł (weekendowa) |
| 3 | 2026-07-07 | Nd | Wysoki | Nie | — | 400 zł (sezon wysoki) |

**Podsumowanie pod tabelą:**

```
Suma nocy:                    1100 zł
Rabat za długi pobyt:         — (min. 7 nocy, masz 3)
Cena końcowa:                 1100 zł
Zaliczka (30%):                330 zł
```

### 12.3 Hierarchia priorytetow cen (do wyswietlenia jako legenda)

```
1. Reguła z cennika dat    ← NAJWYŻSZY priorytet
2. Cena weekendowa         ← nadpisuje sezon i bazową
3. Cena sezonowa (wysoka/niska)
4. Cena bazowa             ← NAJNIŻSZY priorytet
```

Nastepnie:
- Rabat za długi pobyt (% od sumy, jesli noce >= prog)
- Zaliczka (% od ceny koncowej)

### 12.4 Logika (uzywa istniejacego `calculatePrice` z `lib/pricing.ts`)

Symulator powinien:
1. Wywolac `calculatePrice(checkIn, checkOut, settings, pricingRules)` client-side
2. Dodatkowo iterowac po nocach i wyswietlic ktora regula "wygrala" (dla przejrzystosci)
3. Podswietlic noce z regula dat na inny kolor (np. zolty)
4. Podswietlic noce weekendowe (np. niebieski)
5. Pokazac prog rabatu jako progress bar (np. "3/7 nocy do rabatu")

### 12.5 Uwaga implementacyjna

- `calculatePrice` juz zwraca `nightPrices: number[]` — wystarczy dodac info o zrodle ceny
- Funkcja jest czysto obliczeniowa (bez DB), wiec dziala client-side
- Symulator powinien reagowac na zmiany ustawien cenowych w formularzu powyzej (bez koniecznosci zapisu)
- Mozna dodac eksport `getSourceForNight(date, settings, rules)` w `lib/pricing.ts` ktory zwroci typ zrodla ceny ('rule' | 'weekend' | 'seasonHigh' | 'seasonLow' | 'base')
