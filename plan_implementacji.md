# Plan implementacji backendu - HOMMM Admin Panel

## Stan obecny

| Element | Status | Szczegoly |
|---------|--------|-----------|
| Frontend (Next.js 15 + React 19 + TS) | Gotowy | SPA, 1 strona, responsywny design |
| Backend / API | Brak | Zero implementacji |
| Baza danych | Brak | Brak warstwy persystencji |
| i18n (PL/ENG) | Szczatkowy | Tylko PL; przyciski EN nieaktywne |
| Panel admina | Brak | Zero implementacji |
| Autentykacja | Brak | Brak systemu logowania |
| Email / powiadomienia | Brak | Tylko mailto: link |
| Optymalizacja grafik | Czesciowy | Obrazy CSS bez optymalizacji |
| SEO / Analytics | Brak | Brak analytics, brak zarzadzania meta |

---

## Zasady projektu

- **KISS** — minimalny stack, zero zbednych abstrakcji
- **Server Components domyslnie** — `'use client'` tylko gdzie interakcja
- **Server Actions do mutacji** — Route Handlers tylko dla publicznego API (rezerwacje, availability)
- **Fallback na statyczna tresc** — strona dziala nawet bez DB
- **Minimum zaleznosci** — kazda musi miec uzasadnienie

---

## Wybor technologii

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Framework | **Next.js 15 App Router** | Juz uzywany; zero migracji |
| Baza danych | **Neon PostgreSQL** | Serverless, darmowy tier, branching |
| ORM | **Prisma** | Typowany schemat, migracje, integracja z Next.js |
| Autentykacja | **Custom (jose + httpOnly cookie)** | Whitelist emaili + secret code; `jose` jest lekki i ESM-native |
| Email | **Resend + React Email** | Prosty API, 100 maili/dzien free, szablony w JSX |
| i18n | **Custom hook + JSON** | Dla 1 strony wystarczy; zero dodatkowych zaleznosci |
| Walidacja | **Zod** | Jeden schemat na front i back |
| UI admina | **shadcn/ui + Tailwind CSS** | Gotowe komponenty (Table, Form, Dialog, Card), pelna kontrola, zero vendor lock-in |
| Optymalizacja grafik | **Sharp + next/image** | Konwersja do WebP przy uploadzie, serwowanie przez CDN |
| Analytics | **Vercel Analytics** | Zero konfiguracji, wbudowane. GA4 opcjonalnie pozniej |
| Hosting | **Vercel** (frontend + API) + **Neon** (DB) | Darmowy tier, natywna integracja |

### Zaleznosci produkcyjne (nowe)

```
prisma @prisma/client jose zod resend @react-email/components sharp @vercel/analytics
```

### Zaleznosci dev

```
shadcn/ui (npx shadcn@latest init)
```

---

## Architektura systemu

```
HOMMM Site
|
|-- Public (frontend)
|   |-- / .................. Strona glowna (istniejaca)
|   |-- Przelacznik PL/ENG  Prosty hook useLocale() + pliki JSON
|
|-- Admin Panel
|   |-- /admin/login ....... Logowanie (secret code + email)
|   |-- /admin/dashboard ... Statystyki (karty, bez wykresow na start)
|   |-- /admin/content ..... Edycja tresci sekcji (PL/ENG)
|   |-- /admin/gallery ..... Zarzadzanie galeria i grafikami
|   |-- /admin/reservations  Lista rezerwacji + zatwierdzanie
|   |-- /admin/calendar .... Kalendarz dostepnosci
|   |-- /admin/seo ......... Ustawienia SEO i meta tagow
|   |-- /admin/settings .... Ustawienia globalne strony
|
|-- API (Route Handlers - tylko publiczne endpointy)
|   |-- /api/auth/login .... Logowanie -> JWT w httpOnly cookie
|   |-- /api/auth/logout ... Wylogowanie
|   |-- /api/auth/me ....... Sprawdz sesje
|   |-- /api/reservations .. POST nowa rezerwacja (publiczny)
|   |-- /api/reservations/availability .. GET dostepnosc (publiczny)
|
|-- Server Actions (mutacje admina)
|   |-- actions/content .... CRUD tresci sekcji
|   |-- actions/reservations Zmiana statusu, notatki
|   |-- actions/gallery .... Upload, usuwanie, edycja
|   |-- actions/seo ........ Ustawienia SEO
|   |-- actions/settings ... Ustawienia globalne
|
|-- Database (Neon PostgreSQL)
    |-- admins ............. Whitelist adminow
    |-- sessions ........... Sesje logowania
    |-- sections ........... Sekcje strony (JSON content PL/ENG)
    |-- reservations ....... Rezerwacje
    |-- gallery_images ..... Galeria
    |-- seo_settings ....... Ustawienia SEO
    |-- site_settings ...... Ustawienia globalne
```

---

## Schemat bazy danych (Prisma)

```prisma
model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  sessions  Session[]
}

model Session {
  id        String   @id @default(cuid())
  adminId   String
  admin     Admin    @relation(fields: [adminId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Section {
  id          String   @id @default(cuid())
  slug        String   @unique          // "hero", "sec2", "sec3", "sec4"
  order       Int
  isVisible   Boolean  @default(true)
  titlePl     String?
  titleEn     String?
  contentPl   Json                       // Struktura JSON z trescia
  contentEn   Json
  bgImage     String?                    // Sciezka do tla
  bgColor     String?
  tags        String[]                   // Tagi sekcji
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}

model Reservation {
  id          String            @id @default(cuid())
  guestName   String
  guestEmail  String
  guestPhone  String?
  checkIn     DateTime
  checkOut    DateTime
  guests      Int
  nights      Int
  totalPrice  Decimal
  comment     String?                    // Komentarz od goscia
  status      ReservationStatus @default(PENDING)
  adminNote   String?                    // Notatka admina
  isPaid      Boolean           @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

enum ReservationStatus {
  PENDING      // Oczekujaca na zatwierdzenie - BLOKUJE TERMIN
  DEPOSIT_PAID // Oplacona zaliczka - BLOKUJE TERMIN
  PAID         // Oplacona calosc - BLOKUJE TERMIN
  CANCELLED    // Anulowana
  COMPLETED    // Zakonczona (po pobycie)
}

model GalleryImage {
  id          String   @id @default(cuid())
  sectionId   String?
  originalUrl String                     // Oryginalny plik
  webpUrl     String                     // Zoptymalizowany WebP
  thumbUrl    String?                    // Miniatura
  altPl       String?
  altEn       String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
}

model SeoSettings {
  id              String  @id @default(cuid())
  page            String  @unique @default("home")
  titlePl         String?
  titleEn         String?
  descriptionPl   String?
  descriptionEn   String?
  ogImageUrl      String?
  customHeadTags  String?                // Dodatkowe tagi <head>
}

model SiteSettings {
  id              String  @id @default(cuid())
  key             String  @unique
  value           Json
}
```

---

## Fazy implementacji

### FAZA 1: Fundament (baza danych, auth, struktura projektu)

**Cel:** Dzialajacy backend z autentykacja i podstawowa struktura admina.

**Zadania:**

1. **Instalacja zaleznosci**
   ```
   prisma @prisma/client jose zod resend sharp @vercel/analytics
   npx shadcn@latest init (komponenty: button, input, card, table, dialog, form, sheet, tabs)
   ```

2. **Konfiguracja Prisma + Neon PostgreSQL**
   - Plik `prisma/schema.prisma` z pelnym schematem
   - Konfiguracja `.env` (DATABASE_URL, JWT_SECRET, ADMIN_SECRET_CODE)
   - Migracja inicjalna + seed (konto admina, poczatkowe sekcje)

3. **System autentykacji admina**
   - `POST /api/auth/login` — email + secret code → JWT (jose) w httpOnly cookie
   - `POST /api/auth/logout` — usun cookie + sesje z DB
   - `GET /api/auth/me` — sprawdz aktualna sesje
   - Middleware sprawdzajacy JWT na `/admin/*`
   - Whitelist emaili w tabeli `Admin`

4. **Layout panelu admina (shadcn/ui)**
   - `/admin/layout.tsx` — sidebar (Sheet na mobile), topbar, nawigacja
   - `/admin/login/page.tsx` — formularz logowania (shadcn Form + Input)
   - `/admin/dashboard/page.tsx` — karty statystyk (shadcn Card)
   - Dark mode sidebar, jasna tresc

5. **Prisma client singleton** (`lib/db.ts`)

6. **Dokumentacja**
   - `docs/setup.md` — jak uruchomic projekt lokalnie (env, DB, seed, dev server)
   - `docs/architecture.md` — opis architektury: warstwy, flow danych, decyzje techniczne
   - `docs/auth.md` — jak dziala auth (secret code + JWT + whitelist), jak dodac admina

**Rezultat:** Admin moze sie zalogowac i zobaczyc pusty dashboard. Nowy developer moze uruchomic projekt w <15 min.

---

### FAZA 2: Zarzadzanie trescia (CMS)

**Cel:** Admin moze edytowac kazda sekcje strony w PL i ENG.

**Zadania:**

1. **Server Actions dla tresci** (`actions/content.ts`)
   - `getContent()` — pobierz wszystkie sekcje
   - `getContentBySlug(slug)` — pobierz jedna sekcje
   - `updateContent(slug, data)` — aktualizuj sekcje (chronione)

2. **Panel edycji tresci**
   - `/admin/content/page.tsx` — lista sekcji z podgladem (shadcn Table)
   - `/admin/content/[slug]/page.tsx` — edytor sekcji (shadcn Form + Tabs PL/ENG)
   - Przelacznik PL / ENG (shadcn Tabs)
   - Wybor tla sekcji (kolor / obraz)

3. **Custom i18n**
   - `lib/i18n.ts` — hook `useLocale()` + helper `t(key)`
   - `messages/pl.json` + `messages/en.json` — statyczne tlumaczenia UI
   - Dynamiczne tresci z DB wg aktywnego jezyka
   - Przelacznik PL/ENG w TopMenu (zapis w cookie/localStorage)

4. **Refaktor frontendu**
   - Strona glowna pobiera tresc z DB (Server Component + Prisma)
   - Fallback na statyczna tresc z `data/content.ts` gdy DB niedostepne
   - Obsluga przelacznika PL/ENG

5. **Dokumentacja**
   - `docs/content.md` — struktura JSON tresci sekcji, jak dodac nowa sekcje, przyklad danych
   - `docs/i18n.md` — jak dziala i18n, jak dodac nowy jezyk, format plikow tlumaczen

**Rezultat:** Pelna obsluga PL/ENG, admin edytuje tresc w panelu.

---

### FAZA 3: System rezerwacji

**Cel:** Pelny obieg rezerwacji z emailami i kalendarzem.

**Zadania:**

1. **API rezerwacji (publiczne Route Handlers)**
   - `POST /api/reservations` — utworz rezerwacje
     - Walidacja Zod: daty, liczba gosci, email, telefon, komentarz
     - Sprawdzenie dostepnosci terminu
     - Email do goscia (potwierdzenie zgloszenia)
     - Email do admina (powiadomienie)
   - `GET /api/reservations/availability` — sprawdz dostepnosc (publiczny)

2. **Server Actions admina** (`actions/reservations.ts`)
   - `getReservations(filters)` — lista z filtrami
   - `getReservation(id)` — szczegoly
   - `updateReservationStatus(id, status)` — zmien status + wyslij email
   - `addAdminNote(id, note)` — dodaj notatke

3. **Refaktor formularza rezerwacji**
   - Komponent `ReservationForm.tsx` (wydzielony z page.tsx)
   - Walidacja kliencka (Zod)
   - Wysylka do API zamiast mailto:
   - Wyswietlanie zajetych dat w kalendarzu
   - Potwierdzenie po wyslaniu

4. **Szablony email (React Email + Resend)**
   - Email do goscia: "Otrzymalismy Twoja rezerwacje"
   - Email do admina: "Nowa rezerwacja od [imie]"
   - Email do goscia: "Rezerwacja potwierdzona"
   - Email do goscia: "Rezerwacja anulowana"

5. **Panel admina — rezerwacje**
   - `/admin/reservations/page.tsx` — tabela (shadcn Table + filtry)
   - `/admin/reservations/[id]/page.tsx` — szczegoly
   - `/admin/calendar/page.tsx` — widok kalendarza z zajetymi terminami
     - Kolorowanie wg statusu
     - Reczne blokowanie terminow

6. **Dokumentacja**
   - `docs/reservations.md` — caly obieg rezerwacji (statusy, przejscia, blokowanie dat), flow emaili
   - `docs/api.md` — opis publicznych endpointow (rezerwacje, availability), formaty request/response, kody bledow

**Rezultat:** Pelny obieg: gosc → email → admin zatwierdza → kalendarz blokuje.

---

### FAZA 4: Galeria i optymalizacja grafik

**Cel:** Zarzadzanie galeria z automatyczna optymalizacja do WebP.

**Zadania:**

1. **Server Actions galerii** (`actions/gallery.ts`)
   - `uploadImage(formData)` — upload + Sharp (resize, WebP, thumb)
   - `deleteImage(id)` — usun grafike
   - `updateImageOrder(ids[])` — zmien kolejnosc
   - `updateImageAlt(id, altPl, altEn)` — edycja alt text

2. **Panel galerii**
   - `/admin/gallery/page.tsx` — grid z miniaturami
   - Drag & drop upload
   - Zmiana kolejnosci
   - Edycja alt text (PL/ENG)
   - Przypisanie do sekcji

3. **Integracja z frontem**
   - Tla sekcji ladowane z DB
   - next/image z automatycznym WebP

4. **Dokumentacja**
   - `docs/gallery.md` — formaty obrazow, warianty (original/webp/thumb), limity, jak dziala Sharp pipeline

**Rezultat:** Admin uploaduje grafiki → optymalizacja → wyswietlanie na stronie.

---

### FAZA 5: SEO, Analytics i statystyki

**Cel:** Zarzadzanie SEO, analytics, dashboard statystyk.

**Zadania:**

1. **SEO Management**
   - Server Actions: `getSeoSettings()`, `updateSeoSettings(data)`
   - `/admin/seo/page.tsx` — formularz (shadcn Form)
     - Title i description (PL/ENG)
     - OG image
     - Custom head tags
   - Dynamiczne `<head>` w layout na podstawie DB (`generateMetadata`)

2. **Vercel Analytics**
   - `@vercel/analytics` w layout.tsx — zero konfiguracji
   - GA4 opcjonalnie: pole w SeoSettings, komponent `<GoogleAnalytics />` ladowany warunkowo

3. **Dashboard statystyk rezerwacji**
   - `/admin/dashboard/page.tsx` — rozbudowany:
     - Karty: rezerwacje wg statusu, przychod, oblozenosc (shadcn Card)
     - Dane agregowane przez Server Actions (`getStats()`)
     - Wykresy dodane pozniej jesli potrzebne (recharts)

**Rezultat:** SEO zarzadzane z panelu, podstawowe statystyki.

---

### FAZA 6: Ustawienia globalne i finalizacja

**Cel:** Konfiguracja globalna, zabezpieczenia, deploy.

**Zadania:**

1. **Ustawienia globalne** (`/admin/settings/page.tsx`)
   - Cena za noc (obecnie hardcoded 204.5 PLN)
   - Maksymalna liczba gosci
   - Dane kontaktowe (email, telefon, social media)
   - Whitelist adminow (dodaj/usun email)

2. **Zabezpieczenia**
   - Rate limiting na `/api/auth/login` i `/api/reservations` (prosty in-memory counter lub middleware)
   - Walidacja Zod na wszystkich endpointach
   - httpOnly cookies (juz z Fazy 1)
   - Sanityzacja inputow

3. **Deploy na Vercel**
   - Konfiguracja zmiennych srodowiskowych
   - Polaczenie z Neon PostgreSQL
   - Konfiguracja domeny
   - Seed bazy danych

4. **Finalizacja dokumentacji**
   - `docs/deploy.md` — jak deployowac (Vercel + Neon), zmienne srodowiskowe, domena, seed
   - `docs/admin-guide.md` — poradnik dla admina (logowanie, edycja tresci, rezerwacje, galeria, SEO)
   - Przeglad i aktualizacja wszystkich plikow `docs/` — upewnienie sie ze sa spójne z kodem
   - `README.md` — krotki opis projektu + linki do dokumentacji w `docs/`

**Rezultat:** Gotowa aplikacja na produkcji z pelna dokumentacja.

---

## Struktura plikow (docelowa)

```
/15_26_Maja_site/
|-- prisma/
|   |-- schema.prisma
|   |-- seed.ts                    // Dane poczatkowe
|   |-- migrations/
|
|-- app/
|   |-- layout.tsx                 // Root layout + Vercel Analytics
|   |-- page.tsx                   // Strona glowna (Server Component, dane z DB)
|   |-- not-found.tsx
|   |
|   |-- admin/
|   |   |-- layout.tsx             // Dashboard layout (shadcn sidebar, topbar)
|   |   |-- login/page.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- content/
|   |   |   |-- page.tsx           // Lista sekcji
|   |   |   |-- [slug]/page.tsx    // Edytor sekcji
|   |   |-- reservations/
|   |   |   |-- page.tsx           // Lista rezerwacji
|   |   |   |-- [id]/page.tsx      // Szczegoly rezerwacji
|   |   |-- calendar/page.tsx
|   |   |-- gallery/page.tsx
|   |   |-- seo/page.tsx
|   |   |-- settings/page.tsx
|   |
|   |-- api/
|   |   |-- auth/
|   |   |   |-- login/route.ts
|   |   |   |-- logout/route.ts
|   |   |   |-- me/route.ts
|   |   |-- reservations/
|   |   |   |-- route.ts           // POST nowa (publiczny)
|   |   |   |-- availability/route.ts  // GET dostepnosc (publiczny)
|
|-- actions/
|   |-- content.ts                 // Server Actions: CRUD sekcji
|   |-- reservations.ts            // Server Actions: zarzadzanie rezerwacjami (admin)
|   |-- gallery.ts                 // Server Actions: upload, edycja, usuwanie
|   |-- seo.ts                     // Server Actions: ustawienia SEO
|   |-- settings.ts                // Server Actions: ustawienia globalne
|
|-- components/
|   |-- ui/                        // shadcn/ui (auto-generowane)
|   |-- TopMenu.tsx                // Istniejacy (+ przelacznik PL/ENG)
|   |-- Icons.tsx                  // Istniejacy
|   |-- ReservationForm.tsx        // Wydzielony z page.tsx
|   |-- admin/
|   |   |-- Sidebar.tsx
|   |   |-- StatsCard.tsx
|   |   |-- ReservationTable.tsx
|   |   |-- ContentEditor.tsx
|   |   |-- CalendarView.tsx
|   |   |-- ImageUploader.tsx
|
|-- lib/
|   |-- db.ts                      // Prisma client singleton
|   |-- auth.ts                    // jose helpers + middleware
|   |-- mail.ts                    // Resend client
|   |-- image.ts                   // Sharp processing
|   |-- i18n.ts                    // Custom hook useLocale() + helper t()
|   |-- validations.ts             // Zod schemas
|
|-- emails/
|   |-- ReservationConfirmation.tsx
|   |-- ReservationNotifyAdmin.tsx
|   |-- ReservationApproved.tsx
|   |-- ReservationCancelled.tsx
|
|-- messages/
|   |-- pl.json                    // Tlumaczenia PL
|   |-- en.json                    // Tlumaczenia ENG
|
|-- docs/
|   |-- setup.md                   // Uruchomienie lokalne (env, DB, seed, dev)
|   |-- architecture.md            // Warstwy, flow danych, decyzje techniczne
|   |-- auth.md                    // Auth: secret code + JWT + whitelist
|   |-- content.md                 // Struktura JSON sekcji, dodawanie nowej sekcji
|   |-- i18n.md                    // System tlumaczen, dodawanie jezyka
|   |-- reservations.md            // Obieg rezerwacji, statusy, flow emaili
|   |-- api.md                     // Publiczne endpointy: request/response/bledy
|   |-- gallery.md                 // Obrazy: formaty, warianty, Sharp pipeline
|   |-- deploy.md                  // Deploy: Vercel + Neon, env vars, domena
|   |-- admin-guide.md             // Poradnik dla admina (non-tech)
|
|-- data/
|   |-- content.ts                 // Istniejacy (fallback gdy brak DB)
|
|-- public/
|   |-- assets/                    // Istniejace grafiki
|   |-- uploads/                   // Uploadowane grafiki
```

---

## Zmienne srodowiskowe (.env)

```env
# Database (Neon)
DATABASE_URL="postgresql://user:pass@host:5432/hommm"

# Auth
JWT_SECRET="random-secret-min-32-chars"
ADMIN_SECRET_CODE="tajny-kod-dostepu-dla-adminow"

# Email (Resend)
RESEND_API_KEY="re_..."
ADMIN_EMAIL="hommm@hommm.eu"

# App
NEXT_PUBLIC_BASE_URL="https://hommm.eu"
```

---

## Kolejnosc priorytetow

| Priorytet | Faza | Zakres |
|-----------|------|--------|
| 1 (krytyczny) | Faza 1 - Fundament | DB + Auth + Layout admina |
| 2 (krytyczny) | Faza 3 - Rezerwacje | Caly obieg rezerwacji |
| 3 (wysoki) | Faza 2 - CMS + i18n | Edycja tresci PL/ENG |
| 4 (sredni) | Faza 4 - Galeria | Upload + optymalizacja WebP |
| 5 (sredni) | Faza 5 - SEO/Stats | Analytics + dashboard |
| 6 (niski) | Faza 6 - Finalizacja | Ustawienia + deploy |

> Fazy 1 i 3 sa krytyczne — bez nich strona nie ma podstawowej funkcjonalnosci backendu.
> Faza 2 (CMS) moze byc czesciowo realizowana rownolegle z Faza 3.

---

## Uwagi implementacyjne

1. **Secret code auth** — Admin podaje email + tajny kod (wspolny). Jesli email na whitelist i kod OK → JWT (jose) w httpOnly cookie. Proste i bezpieczne dla malego zespolu.

2. **Server Actions vs Route Handlers** — Route Handlers tylko dla publicznego API (tworzenie rezerwacji, sprawdzanie dostepnosci). Wszystkie mutacje admina przez Server Actions (`'use server'`) — prostsze, typowane, bez recznego fetch.

3. **JSON content** — Tresc sekcji jako JSON w Prisma (`Json` type). Elastyczna struktura bez zmian schematu.

4. **Fallback na statyczna tresc** — Frontend laduje z DB (Server Component + Prisma). Gdy DB niedostepne — fallback na `data/content.ts`.

5. **Custom i18n** — Hook `useLocale()` + pliki `messages/pl.json` i `en.json`. Jezyk w cookie. Dynamiczna tresc z DB (`titlePl`/`titleEn`, `contentPl`/`contentEn`).

6. **Optymalizacja grafik** — Sharp przetwarza przy uploadzie (nie przy kazdym uzyciu). 3 warianty: original, webp (max 1920px), thumb (400px).

7. **Kalendarz dostepnosci** — Rezerwacje PENDING, DEPOSIT_PAID, PAID blokuja daty. Uzytkownik widzi "zajete", admin widzi szczegolowy status.

8. **shadcn/ui** — Komponenty kopiowane do projektu (components/ui/). Uzywane w panelu admina: Table, Form, Dialog, Card, Sheet, Tabs, Input, Button. Pelna kontrola, zero vendor lock-in.

9. **Wykresy** — Na start karty statystyk (shadcn Card). Recharts dodany pozniej gdy beda dane.

10. **Rate limiting** — Prosty in-memory counter w middleware na `/api/auth/login` i `/api/reservations`. Bez dodatkowych bibliotek.

11. **Dokumentacja** — Tworzona przyrostowo z kazdą fazą (nie na koniec). Kazdy plik w `docs/` opisuje jedno zagadnienie. Format: krotki opis → jak to dziala → jak zmodyfikowac/rozszerzyc → przyklady. `admin-guide.md` jest pisany dla osoby nietechnicznej. Dokumentacja aktualizowana przy kazdej zmianie kodu, ktora zmienia zachowanie opisane w docs.
