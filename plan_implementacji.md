# Plan implementacji - HOMMM Site & Admin Panel

## Wymagania formalne (mapowanie)

Ponizej mapowanie wymagan formalnych na konkretne fazy i elementy planu:

| Wymaganie formalne | Faza | Realizacja |
|--------------------|------|------------|
| **UX (User Experience)** | Faza 0 + ciagle | Analiza sciezki uzytkownika, optymalizacja flow rezerwacji, spójnosc nawigacji |
| **Customer Journey** | Faza 0 | Mapa punktow kontaktu: strona → rezerwacja → email → potwierdzenie → pobyt |
| **Architektura informacji** | Faza 0 + Faza 2 | Struktura nawigacji, hierarchia tresci, taxonomia sekcji |
| **Zarzadzanie trescia (CMS)** | Faza 2 | Panel admina: edycja sekcji PL/ENG, strategia tresci, SEO w Fazie 5 |
| **Integracja z systemami zewnetrznymi** | Faza 1, 3, 5 | Railway PostgreSQL (DB), Railway Redis (rate limiting), email (Resend API lub wlasny SMTP/nodemailer — do wyboru), Umami/Plausible (analytics). Platnosci i CRM — poza zakresem obecnego planu (przyszly etap) |
| **Responsywnosc i dostepnosc** | Faza 0 + ciagle | Istniejacy responsywny design + audyt WCAG 2.1 AA, atrybuty ARIA, focus management |
| **Testowanie i optymalizacja** | Faza 7 | Testy uzytecznosci, scenariusze manualne, Lighthouse, zbieranie opinii |
| **Bezpieczenstwo** | Faza 1, 6 | JWT httpOnly, CSP headers, rate limiting, walidacja Zod, HTTPS (Railway custom domain), sanityzacja |
| **Analiza danych i metryk** | Faza 5 | Umami (self-hosted na Railway) lub Plausible, KPI (rezerwacje, konwersja, oblozenosc), GA4 opcjonalnie |
| **Dokumentacja techniczna** | Kazda faza | Przyrostowa dokumentacja w `docs/`, przekazanie pelnego pakietu na koniec |

---

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
| Baza danych | **Railway PostgreSQL** | Wbudowany w Railway, zero zewnetrznych serwisow |
| ORM | **Prisma** | Typowany schemat, migracje, integracja z Next.js |
| Autentykacja | **Custom (jose + httpOnly cookie)** | Whitelist emaili + secret code; `jose` jest lekki i ESM-native |
| Email | **Resend API lub wlasny SMTP (nodemailer)** | Do wyboru w ustawieniach admina; React Email dla szablonow JSX |
| i18n | **Custom hook + JSON** | Dla 1 strony wystarczy; zero dodatkowych zaleznosci |
| Walidacja | **Zod** | Jeden schemat na front i back |
| UI admina | **shadcn/ui + Tailwind CSS** | Gotowe komponenty (Table, Form, Dialog, Card), pelna kontrola, zero vendor lock-in |
| Optymalizacja grafik | **Sharp + next/image** | Konwersja do WebP przy uploadzie, serwowanie z Railway |
| Storage grafik | **Railway Volume** | Persistent storage, writeable filesystem, montowany do kontenera |
| Rate limiting | **In-memory (express-rate-limit lub custom)** | Railway = always-on container, in-memory dziala poprawnie |
| Analytics | **Umami (self-hosted)** | Open-source, self-hosted na Railway (osobny serwis), GDPR-friendly. GA4 opcjonalnie |
| Hosting | **Railway** (frontend + API + DB + Redis) | ~$5/mies., wszystko w jednym, dozwolone uzycie komercyjne |

### Zaleznosci produkcyjne (nowe)

```
prisma @prisma/client jose zod resend @react-email/components nodemailer sharp
```

> **Uwaga:** `@xyflow/react` instalowany w Fazie 6 (edytor struktury serwisu), nie wczesniej (YAGNI).
> Brak zaleznosci od `@vercel/*` i `@upstash/*` — Railway zastepuje te serwisy wbudowanymi rozwiazaniami.

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
|-- Database (Railway PostgreSQL)
    |-- admins ............. Whitelist adminow
    |-- sessions ........... Sesje logowania
    |-- pages .............. Drzewo stron (hierarchia parent → child)
    |-- sections ........... Sekcje stron (JSON content PL/ENG, powiazane z Page)
    |-- reservations ....... Rezerwacje
    |-- gallery_images ..... Galeria
    |-- seo_settings ....... Ustawienia SEO (per strona)
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

model Page {
  id          String   @id @default(cuid())
  slug        String   @unique          // URL slug (np. "oferta", "oferta/apartament-1")
  parentId    String?                    // null = strona glowna / top-level
  parent      Page?    @relation("PageTree", fields: [parentId], references: [id])
  children    Page[]   @relation("PageTree")
  title       String                     // Tytul wewnetrzny (widoczny w grafie)
  order       Int      @default(0)       // Kolejnosc wsrod rodzenstwa
  isVisible   Boolean  @default(true)    // Widocznosc na stronie
  isHome      Boolean  @default(false)   // Czy to strona glowna (max 1)
  sections    Section[]
  seo         SeoSettings?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}

model Section {
  id          String   @id @default(cuid())
  pageId      String                     // Strona do ktorej nalezy sekcja
  page        Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  slug        String                     // "hero", "koncept", "miejsce", "kontakt"
  order       Int
  isVisible   Boolean  @default(true)
  titlePl     String?
  titleEn     String?
  contentPl   Json                       // Struktura JSON z trescia
  contentEn   Json
  bgImage     String?                    // Sciezka do tla
  bgColor     String?
  tags        String[]                   // Tagi sekcji
  galleryImages GalleryImage[]            // Grafiki przypisane do sekcji
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@unique([pageId, slug])               // Slug unikalny w ramach strony
}

model Reservation {
  id          String            @id @default(cuid())
  guestName   String
  guestEmail  String
  guestPhone  String?
  checkIn     DateTime
  checkOut    DateTime
  guests      Int
  nights      Int                        // Denormalizacja: wyliczalne z dat, ale przechowywane dla wygody
  totalPrice  Decimal                    // Denormalizacja: cena z momentu rezerwacji (cena/noc moze sie zmienic)
  comment     String?                    // Komentarz od goscia
  status      ReservationStatus @default(PENDING)
  adminNote   String?                    // Notatka admina
  isPaid      Boolean           @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([checkIn, checkOut])            // Szybkie zapytania o dostepnosc
  @@index([status])                       // Filtrowanie wg statusu
}

enum ReservationStatus {
  PENDING      // Oczekujaca na zatwierdzenie - BLOKUJE TERMIN
  DEPOSIT_PAID // Oplacona zaliczka - BLOKUJE TERMIN
  PAID         // Oplacona calosc - BLOKUJE TERMIN
  CANCELLED    // Anulowana
  COMPLETED    // Zakonczona (po pobycie)
}

model BlockedDate {
  id      String   @id @default(cuid())
  date    DateTime
  reason  String?                        // Powod blokady (np. "remont", "prywatne")
  createdAt DateTime @default(now())

  @@index([date])
}

model GalleryImage {
  id          String   @id @default(cuid())
  sectionId   String?
  section     Section? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  originalUrl String                     // Oryginalny plik (Railway Volume path)
  webpUrl     String                     // Zoptymalizowany WebP (Railway Volume path)
  thumbUrl    String?                    // Miniatura (Railway Volume path)
  altPl       String?
  altEn       String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
}

model SeoSettings {
  id              String  @id @default(cuid())
  pageId          String  @unique              // Powiazanie z Page
  page            Page    @relation(fields: [pageId], references: [id], onDelete: Cascade)
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

### FAZA 0: UX, Customer Journey i Architektura Informacji

**Cel:** Dokumentacja UX, mapa podrozy klienta i architektura informacji przed implementacja.

**Zadania:**

1. **Analiza UX i sciezka uzytkownika**
   - Zdefiniowanie glownych person (gosc szukajacy noclegu, admin zarzadzajacy obiektem)
   - Optymalizacja sciezki: landing → przeglad sekcji → formularz rezerwacji → potwierdzenie
   - Identyfikacja punktow tarcia (obecnie: mailto: zamiast formularza, brak EN)

2. **Customer Journey Map**
   - Punkty kontaktu: strona glowna → sekcje informacyjne → formularz rezerwacji → email potwierdzenia → email zatwierdzenia → pobyt → follow-up
   - Kanaly: strona WWW, email (Resend), telefon (dane kontaktowe)
   - Momenty krytyczne: pierwszy kontakt (hero), decyzja o rezerwacji (cena + dostepnosc), potwierdzenie (email)

3. **Architektura informacji**
   - Hierarchia tresci: Hero → O obiekcie → Galeria → Cennik/Dostepnosc → Rezerwacja → Kontakt
   - Nawigacja: TopMenu (istniejace) + anchor links do sekcji + przelacznik PL/ENG
   - Taxonomia sekcji w CMS (slug: hero, about, gallery, pricing, reservation, contact)
   - Mapa strony (sitemap.xml) dla SEO

4. **Audyt dostepnosci (WCAG 2.1 AA)**
   - Przeglad istniejacego frontendu pod katem: kontrast kolorow, alt text grafik, nawigacja klawiatura, focus visible
   - Lista poprawek do wdrozenia w kolejnych fazach
   - Atrybuty ARIA na komponentach interaktywnych (formularz, menu, przelaczniki)

5. **Dokumentacja**
   - `docs/ux-customer-journey.md` — persony, customer journey map, punkty tarcia, rekomendacje
   - `docs/information-architecture.md` — hierarchia tresci, nawigacja, taxonomia sekcji, sitemap

**Rezultat:** Udokumentowana strategia UX i IA. Jasna mapa podrozy klienta. Lista poprawek dostepnosci.

---

### FAZA 1: Fundament (baza danych, auth, struktura projektu)

**Cel:** Dzialajacy backend z autentykacja i podstawowa struktura admina.

**Zadania:**

1. **Instalacja zaleznosci**
   ```
   npm install tailwindcss @tailwindcss/postcss postcss
   prisma @prisma/client jose zod resend sharp
   npx shadcn@latest init (komponenty: button, input, card, table, dialog, form, sheet, tabs)
   ```
   > **Uwaga:** Tailwind CSS musi byc zainstalowany PRZED shadcn/ui (shadcn go wymaga).

2. **Konfiguracja Prisma + Railway PostgreSQL**
   - Plik `prisma/schema.prisma` z pelnym schematem
   - Konfiguracja `.env` (`DATABASE_URL` z Railway, JWT_SECRET, ADMIN_SECRET_CODE)
   - Migracja inicjalna + seed (konto admina, poczatkowe sekcje)

3. **System autentykacji admina**
   - `POST /api/auth/login` — email + secret code → JWT (jose) w httpOnly cookie
   - `POST /api/auth/logout` — usun cookie + sesje z DB
   - `GET /api/auth/me` — sprawdz aktualna sesje
   - `middleware.ts` (root) sprawdzajacy JWT na `/admin/*`
   - Whitelist emaili w tabeli `Admin`
   - Czyszczenie wygaslych sesji przy kazdym logowaniu (`deleteMany where expiresAt < now()`)

4. **Layout panelu admina (shadcn/ui)**
   - `/admin/layout.tsx` — sidebar (Sheet na mobile), topbar, nawigacja
   - `/admin/login/page.tsx` — formularz logowania (shadcn Form + Input)
   - `/admin/dashboard/page.tsx` — karty statystyk (shadcn Card)
   - Dark mode sidebar, jasna tresc

5. **Prisma client singleton** (`lib/db.ts`)

6. **Bazowe zabezpieczenia (Security Headers)**
   - Content Security Policy (CSP) w `next.config.ts` lub middleware
   - Strict-Transport-Security (HSTS) — wymuszenie HTTPS (Railway custom domain z Let's Encrypt)
   - X-Content-Type-Options, X-Frame-Options, Referrer-Policy
   - HTTPS zapewnione przez Railway (automatyczne certyfikaty Let's Encrypt dla custom domain)

7. **Dostepnosc — poprawki bazowe (z audytu Fazy 0)**
   - Semantyczny HTML: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`
   - Focus visible na elementach interaktywnych
   - Skip-to-content link
   - `lang="pl"` / `lang="en"` na `<html>` wg aktywnego jezyka

8. **Dokumentacja**
   - `docs/setup.md` — jak uruchomic projekt lokalnie (env, DB, seed, dev server)
   - `docs/architecture.md` — opis architektury: warstwy, flow danych, decyzje techniczne, Railway setup
   - `docs/auth.md` — jak dziala auth (secret code + JWT + whitelist), jak dodac admina
   - `docs/security.md` — polityka bezpieczenstwa: headers, szyfrowanie, ochrona endpointow

**Rezultat:** Admin moze sie zalogowac i zobaczyc pusty dashboard. Nowy developer moze uruchomic projekt w <15 min. Bazowe zabezpieczenia wdrozone.

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
   - **Modal potwierdzenia po kliknieciu "REZERWUJ"** (shadcn Dialog):
     - Podsumowanie: wybrane daty, liczba nocy, liczba gosci, cena
     - Pola formularza:
       - Imie i nazwisko (wymagane)
       - Email (wymagany, walidacja formatu)
       - Telefon (wymagany, walidacja formatu)
       - Komentarz / dodatkowe informacje (opcjonalne, Textarea)
     - Checkbox RODO: "Wyrazam zgode na przetwarzanie danych osobowych w celu realizacji rezerwacji" (wymagany)
     - Link do pelnej polityki prywatnosci
     - Przycisk "Wyslij rezerwacje" (disabled do zaakceptowania RODO)
     - Stany: formularz → ladowanie → sukces / blad
   - Potwierdzenie po wyslaniu (ekran sukcesu w modalu lub osobna strona)

4. **System email (Resend API lub wlasny SMTP — do wyboru)**
   - **Abstrakcja wysylki** (`lib/mail.ts`):
     - Interface `sendEmail(to, subject, html)` — wspolny dla obu providerow
     - Provider Resend: `resend.emails.send()` (wymaga `RESEND_API_KEY`)
     - Provider SMTP: `nodemailer.createTransport()` (wymaga `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
     - Wybor providera w `/admin/settings` lub przez zmienne srodowiskowe
   - **Szablony email (React Email)**:
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
   - `uploadImage(formData)` — upload do Railway Volume + Sharp (resize, WebP, thumb)
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
   - Tla sekcji ladowane z DB (URL-e do plikow na Railway Volume)
   - next/image z automatycznym WebP
   - Statyczny endpoint `/api/uploads/[...path]` serwujacy pliki z Volume

4. **Dokumentacja**
   - `docs/gallery.md` — formaty obrazow, warianty (original/webp/thumb), limity, Sharp pipeline, Railway Volume mount

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

2. **Analytics (Umami self-hosted lub Plausible)**
   - Umami: deploy jako osobny serwis na Railway (open-source, GDPR-friendly, ~0 dodatkowego kosztu)
   - Alternatywnie: Plausible Cloud ($9/mies.) lub GA4 (darmowe)
   - Skrypt trackujacy w layout.tsx, dane w osobnej bazie Umami

3. **Dashboard statystyk rezerwacji i KPI**
   - `/admin/dashboard/page.tsx` — rozbudowany:
     - Karty: rezerwacje wg statusu, przychod, oblozenosc (shadcn Card)
     - Dane agregowane przez Server Actions (`getStats()`)
     - Wykresy dodane pozniej jesli potrzebne (recharts)
   - **KPI (Key Performance Indicators):**
     - Wskaznik konwersji: odwiedziny strony → wyslane rezerwacje (Umami + DB)
     - Sredni czas odpowiedzi admina na rezerwacje
     - Oblozenosc miesieczna/roczna (% zajetych nocy)
     - Przychod miesieczny/roczny
     - Najpopularniejsze okresy (heatmapa kalendarza)

4. **Sitemap i dane strukturalne**
   - Automatyczny `sitemap.xml` (Next.js `app/sitemap.ts`)
   - Dane strukturalne JSON-LD (LocalBusiness, LodgingBusiness)
   - Robots.txt (`app/robots.ts`)

5. **SEO pod modele LLM i boty AI (Generative Engine Optimization)**
   - **llms.txt** — plik `/public/llms.txt` z opisem obiektu w formacie czytelnym dla LLM:
     - Nazwa, lokalizacja, typ obiektu, oferta, cennik, kontakt
     - Kluczowe USP (cisza, natura, prywatnosc)
     - Link do rezerwacji i danych kontaktowych
     - Aktualizowany z panelu admina (Server Action `updateLlmsTxt()`)
   - **llms-full.txt** — rozszerzona wersja z pelna trescia wszystkich sekcji PL/ENG (`/public/llms-full.txt`)
     - Generowany automatycznie z tresci sekcji w DB
   - **Dane strukturalne rozszerzone**
     - Schema.org `LodgingBusiness` wzbogacony o: `amenityFeature`, `checkinTime`, `checkoutTime`, `numberOfRooms`, `priceRange`, `geo` (lat/lng), `aggregateRating` (gdy dostepne)
     - `FAQPage` schema (jesli sekcja FAQ zostanie dodana)
     - `BreadcrumbList` dla nawigacji wewnetrznej
   - **Optymalizacja tresci pod AI Overview / AI Search**
     - Jasne, zwiezle odpowiedzi na pytania (format Q&A) w tresci sekcji
     - Naglowki H1-H3 z konkretnymi frazami (nie generyczne "O nas")
     - Atrybut `lang` na tresci PL i ENG — pomaga LLM rozpoznac jezyk
   - **Kontrola dostepu botow AI**
     - Rozszerzenie `robots.txt` o reguly dla crawlerow AI:
       ```
       # AI Crawlers — zezwol na indeksowanie
       User-agent: GPTBot
       Allow: /
       User-agent: Google-Extended
       Allow: /
       User-agent: anthropic-ai
       Allow: /
       User-agent: ClaudeBot
       Allow: /
       User-agent: PerplexityBot
       Allow: /
       User-agent: Applebot-Extended
       Allow: /
       ```
     - Mozliwosc zarzadzania regulami z panelu admina (pole w SeoSettings)
   - **Meta tagi dla AI**
     - `<meta name="robots" content="max-snippet:-1">` — pelne snippety dla AI
     - Canonical URL na kazdej stronie

**Rezultat:** SEO zarzadzane z panelu, KPI sledzone w dashboardzie, sitemap, dane strukturalne. Strona czytelna dla LLM i botow AI (llms.txt, rozszerzone schema, kontrola crawlerow).

---

### FAZA 6: Struktura serwisu, ustawienia globalne i finalizacja

**Cel:** Wizualny edytor struktury serwisu, konfiguracja globalna, zabezpieczenia, deploy.

**Zadania:**

1. **Wizualizacja i zarzadzanie struktura serwisu** (`/admin/site-structure/page.tsx`)
   - **Graficzny edytor struktury** (React Flow / xyflow):
     - Widok grafu wezlow — kazdy wezel = strona (`Page`)
     - Polaczenia miedzy wezlami = relacje parent → child
     - Kolory wezlow wg statusu: zielony (widoczna), szary (ukryta), niebieski (strona glowna)
     - Podglad liczby sekcji na kazdym wezle
   - **Operacje na wezlach**:
     - Dodaj podstrone (klik prawym / przycisk "+") — tworzy `Page` z `parentId`
     - Usun strone (z potwierdzeniem; kaskadowo usuwa sekcje i dzieci lub przenosi dzieci do rodzica)
     - Przeciagnij wezel na innego rodzica (zmiana `parentId`)
     - Zmien kolejnosc rodzenstwa (drag & drop)
     - Klik na wezel → panel boczny z edycja: tytul, slug, widocznosc
     - Dwuklik na wezel → przejscie do edycji sekcji strony (`/admin/content/[slug]`)
   - **Generowanie nawigacji**:
     - Automatyczne budowanie menu na podstawie drzewa stron
     - Mozliwosc oznaczenia strony "ukryta w menu" (widoczna pod URL, ale nie w nawigacji)
   - **Server Actions** (`actions/pages.ts`):
     - `getPageTree()` — pelne drzewo stron z relacjami
     - `createPage(data)` — nowa strona
     - `updatePage(id, data)` — edycja (tytul, slug, parentId, order, isVisible)
     - `deletePage(id)` — usun z kaskada
     - `reorderPages(updates[])` — batch update kolejnosci
   - **Dynamiczny routing**:
     - `app/[...slug]/page.tsx` — catch-all route dla podstron
     - Strona glowna (`isHome: true`) → `app/page.tsx` (bez zmian)
     - Kazda podstrona renderuje swoje sekcje wg kolejnosci z DB
     - 404 gdy slug nie istnieje lub strona ukryta
   - **Dokumentacja**:
     - `docs/site-structure.md` — jak dziala drzewo stron, jak dodac podstrone, jak zmienia sie routing i nawigacja

2. **Ustawienia globalne** (`/admin/settings/page.tsx`)
   - Cena za noc (obecnie hardcoded 204.5 PLN)
   - Maksymalna liczba gosci
   - Dane kontaktowe (email, telefon, social media)
   - Whitelist adminow (dodaj/usun email)

3. **Zabezpieczenia (rozszerzone)**
   - Rate limiting na `/api/auth/login` i `/api/reservations` (in-memory Map — Railway to always-on container, state persists)
   - Walidacja Zod na wszystkich endpointach
   - httpOnly cookies (juz z Fazy 1)
   - Sanityzacja inputow (XSS prevention)
   - CSRF protection na Server Actions (wbudowane w Next.js)
   - Audyt OWASP Top 10 — checklist:
     - Injection (SQL — Prisma parametryzuje; XSS — sanityzacja)
     - Broken Authentication (JWT expiry, session invalidation)
     - Sensitive Data Exposure (brak sekretow w repo, HTTPS)
     - Security Misconfiguration (CSP, headers z Fazy 1)
   - Szyfrowanie danych w tranzycie: HTTPS (Railway custom domain + Let's Encrypt) + internal networking do PostgreSQL

4. **Automatyczne backupy**
   - **Codzienny backup (retencja 14 dni)**:
     - Dump bazy PostgreSQL (`pg_dump`) + spakowanie uploadeow (galeria)
     - Cron job o 3:00 w nocy
     - Rotacja: usuwanie backupow starszych niz 14 dni
   - **Tygodniowy backup (retencja 8 tygodni)**:
     - Pelny dump DB + uploads + konfiguracja (.env.example, schema Prisma)
     - Cron job w niedziele o 4:00
     - Rotacja: usuwanie backupow starszych niz 8 tygodni
   - **Dostarczanie backupow (do wyboru)**:
     - **Email**: wysylka spakowanego archiwum (.tar.gz) na wskazany adres (przez skonfigurowany provider email)
     - **FTP/SFTP**: upload na zewnetrzny serwer (konfigurowalny host/port/sciezka)
     - Konfiguracja metody w `/admin/settings` (email/FTP, dane dostepu)
   - **Realizacja techniczna**:
     - `lib/backup.ts` — logika tworzenia dumpa, pakowania, rotacji
     - `app/api/cron/backup/route.ts` — endpoint wyzwalany przez cron
     - Weryfikacja CRON_SECRET w ustawieniach
     - Logi backupow widoczne w `/admin/settings` (data, rozmiar, status)
   - **Dokumentacja**:
     - `docs/backup.md` — konfiguracja, harmonogram, przywracanie z backupu, troubleshooting

5. **Deploy na Railway**
   - Utworzenie projektu Railway z serwisami: Next.js app + PostgreSQL + Volume (uploads)
   - Konfiguracja zmiennych srodowiskowych (Railway dashboard)
   - Polaczenie z Railway PostgreSQL (internal URL)
   - Konfiguracja domeny (Railway custom domain + SSL automatyczny)
   - Railway Volume mount na `/app/uploads` (persistent storage dla grafik)
   - Seed bazy danych
   - `railway.json` / `Dockerfile` (opcjonalnie, Railway auto-detects Next.js)

6. **Finalizacja dokumentacji technicznej**
   - `docs/deploy.md` — jak deployowac (Railway), zmienne srodowiskowe, Railway Volume, domena, seed
   - `docs/admin-guide.md` — poradnik dla admina (logowanie, edycja tresci, rezerwacje, galeria, SEO)
   - `docs/security.md` — aktualizacja: pelna polityka bezpieczenstwa, audyt OWASP, headers
   - Przeglad i aktualizacja wszystkich plikow `docs/` — upewnienie sie ze sa spójne z kodem
   - `README.md` — krotki opis projektu + linki do dokumentacji w `docs/`

7. **Pakiet przekazania**
   - Kompletna dokumentacja techniczna (architektura, API, schemat DB, deploy)
   - Dokumentacja uzytkownika (admin-guide)
   - Instrukcja utrzymania i aktualizacji
   - Lista zmiennych srodowiskowych z opisami
   - Dane dostepu do Railway, provider email (Resend lub SMTP — przekazanie kont/konfiguracji)

**Rezultat:** Gotowa aplikacja na produkcji z pelna dokumentacja i pakietem przekazania.

---

### FAZA 7: Testowanie, optymalizacja i odbiór

**Cel:** Weryfikacja jakosci, wydajnosci i uzytecznosci przed odbiorem.

**Zadania:**

1. **Testy uzytecznosci**
   - Scenariusze manualne dla glownych flow:
     - Gosc: wejscie na strone → przeglad sekcji → rezerwacja → potwierdzenie email
     - Admin: logowanie → przeglad rezerwacji → zatwierdzenie → edycja tresci
   - Testy na urzadzeniach: desktop, tablet, mobile (min. 3 rozdzielczosci)
   - Testy przegladarek: Chrome, Firefox, Safari, Edge

2. **Audyt wydajnosci (Lighthouse)**
   - Performance score > 90
   - Accessibility score > 90 (WCAG 2.1 AA)
   - Best Practices score > 90
   - SEO score > 90
   - Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

3. **Audyty bezpieczenstwa**
   - **Audyt OWASP Top 10**:
     - A01 Broken Access Control — weryfikacja auth na kazdym chronionym endpoincie
     - A02 Cryptographic Failures — przeglag JWT, haszowania hasel, HTTPS
     - A03 Injection — testy SQL injection (Prisma parametryzuje), XSS (sanityzacja inputow)
     - A05 Security Misconfiguration — CSP headers (csp-evaluator.withgoogle.com), CORS, X-Frame-Options
     - A07 Authentication Failures — brute-force login (rate limiting), session expiry, token rotation
   - **Skanowanie automatyczne**:
     - `npm audit` — znane podatnosci w zaleznosach
     - OWASP ZAP lub Nikto — skan aplikacji webowej (XSS, CSRF, open redirects)
     - SSL Labs test (ssllabs.com) — ocena A+
     - Mozilla Observatory (observatory.mozilla.org) — ocena A+
   - **Testy manualne**:
     - Test rate limitingu (obciazenie endpointow login, rezerwacje)
     - Sprawdzenie ze brak sekretow w kodzie i repo (`git log --all -p | grep -i secret`)
     - Weryfikacja httpOnly/Secure/SameSite na cookies
     - Test IDOR (proba dostepu do cudzych zasobow przez zmiane ID w URL)
     - Test eskalacji uprawnien (niezalogowany → admin endpoints)
   - **Cykliczny audyt (po deploymencie)**:
     - Automatyczny `npm audit` w CI/CD pipeline (blokuje deploy przy krytycznych)
     - Miesieczny przeglad zaleznosci (`npm outdated`)
     - Kwartalny przeglad CSP i headers
   - **Dokumentacja**:
     - `docs/security-audit.md` — checklist audytu, wyniki, plan naprawczy, harmonogram cyklicznych przeglad

4. **Zbieranie opinii i poprawki**
   - Feedback od zleceniodawcy na podstawie wersji preview (Railway preview deployment)
   - Iteracyjne poprawki UX na podstawie uwag
   - Finalne zatwierdzenie przed przejsciem na produkcje

5. **Dokumentacja testow**
   - `docs/testing.md` — scenariusze testowe, wyniki Lighthouse, checklist bezpieczenstwa
   - Raport z audytu dostepnosci (WCAG 2.1 AA compliance)

**Rezultat:** Przetestowana, zoptymalizowana aplikacja gotowa do odbioru. Udokumentowane wyniki testow.

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
|   |-- layout.tsx                 // Root layout + Umami Analytics script
|   |-- page.tsx                   // Strona glowna (Server Component, dane z DB)
|   |-- [...slug]/page.tsx         // Dynamiczny routing podstron
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
|   |   |-- site-structure/page.tsx // Wizualny edytor struktury serwisu (React Flow)
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
|   |-- pages.ts                   // Server Actions: CRUD stron, drzewo, reorder
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
|   |   |-- SiteStructureGraph.tsx  // React Flow — graf wezlow struktury serwisu
|
|-- lib/
|   |-- db.ts                      // Prisma client singleton
|   |-- auth.ts                    // jose helpers + middleware
|   |-- mail.ts                    // Abstrakcja email (Resend API lub SMTP/nodemailer)
|   |-- image.ts                   // Sharp processing
|   |-- i18n.ts                    // Custom hook useLocale() + helper t()
|   |-- validations.ts             // Zod schemas (w tym walidacja slug: regex + ochrona /admin, /api)
|
|-- middleware.ts                      // Auth middleware: JWT check na /admin/*, rate limiting
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
|   |-- security.md                // Polityka bezpieczenstwa: headers, OWASP, szyfrowanie
|   |-- ux-customer-journey.md     // Persony, mapa podrozy klienta, punkty tarcia
|   |-- information-architecture.md // Hierarchia tresci, nawigacja, taxonomia
|   |-- content.md                 // Struktura JSON sekcji, dodawanie nowej sekcji
|   |-- i18n.md                    // System tlumaczen, dodawanie jezyka
|   |-- reservations.md            // Obieg rezerwacji, statusy, flow emaili
|   |-- api.md                     // Publiczne endpointy: request/response/bledy
|   |-- gallery.md                 // Obrazy: formaty, warianty, Sharp pipeline
|   |-- site-structure.md          // Drzewo stron, routing, nawigacja, React Flow
|   |-- testing.md                 // Scenariusze testowe, Lighthouse, checklist
|   |-- deploy.md                  // Deploy: Railway, env vars, Volume, domena
|   |-- admin-guide.md             // Poradnik dla admina (non-tech)
|
|-- data/
|   |-- content.ts                 // Istniejacy (fallback gdy brak DB)
|
|-- public/
|   |-- assets/                    // Istniejace grafiki
|
|-- uploads/                           // Railway Volume mount — persistent storage dla uploadowanych grafik
|   |-- original/                      // Oryginaly
|   |-- webp/                          // Zoptymalizowane WebP
|   |-- thumbs/                        // Miniatury
```

---

## Zmienne srodowiskowe (.env)

```env
# Database (Railway PostgreSQL — ustawiane automatycznie przez Railway)
DATABASE_URL="postgresql://user:pass@host:5432/hommm"

# Auth
JWT_SECRET="<set-a-real-secret-in-env>"
ADMIN_SECRET_CODE="<set-a-real-admin-code-in-env>"

# Email — opcja A: Resend API
RESEND_API_KEY="re_..."
# Email — opcja B: wlasny SMTP (nodemailer)
SMTP_HOST="mail.example.com"
SMTP_PORT="465"
SMTP_USER="user@example.com"
SMTP_PASS="..."
# Wspolne
EMAIL_PROVIDER="resend"          # "resend" lub "smtp"
ADMIN_EMAIL="hommm@hommm.eu"

# Storage (Railway Volume — sciezka montowania)
UPLOADS_DIR="/app/uploads"

# App
NEXT_PUBLIC_BASE_URL="https://hommm.eu"
PORT="3000"
```

> Railway automatycznie ustawia `DATABASE_URL` po dodaniu serwisu PostgreSQL. `UPLOADS_DIR` wskazuje na zamontowany Railway Volume.

---

## Kolejnosc priorytetow

| Priorytet | Faza | Zakres |
|-----------|------|--------|
| 0 (wstepny) | Faza 0 - UX/IA/CJ | Analiza UX, Customer Journey, Architektura Informacji, audyt dostepnosci |
| 1 (krytyczny) | Faza 1 - Fundament | DB + Auth + Layout admina + Security Headers + poprawki a11y |
| 2 (krytyczny) | Faza 3 - Rezerwacje | Caly obieg rezerwacji |
| 3 (wysoki) | Faza 2 - CMS + i18n | Edycja tresci PL/ENG |
| 4 (sredni) | Faza 4 - Galeria | Upload + optymalizacja WebP |
| 5 (sredni) | Faza 5 - SEO/Stats/KPI | Analytics + dashboard + KPI + sitemap |
| 6 (niski) | Faza 6 - Struktura + Finalizacja | Wizualny edytor struktury serwisu + ustawienia + deploy + przekazanie |
| 7 (koncowy) | Faza 7 - Testowanie | Testy uzytecznosci, Lighthouse, bezpieczenstwo, odbiór |

> Faza 0 jest wstepna — dokumentacja UX/IA powstaje przed implementacja.
> Fazy 1 i 3 sa krytyczne — bez nich strona nie ma podstawowej funkcjonalnosci backendu.
> Faza 2 (CMS) moze byc czesciowo realizowana rownolegle z Faza 3.
> Faza 7 jest koncowa — testowanie i odbiór po wdrozeniu wszystkich funkcjonalnosci.

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

10. **Rate limiting** — Prosty in-memory counter (Map) w middleware na `/api/auth/login` i `/api/reservations`. Railway to always-on container (nie serverless) — in-memory state persists miedzy requestami. Bez dodatkowych zaleznosci.

11. **Dokumentacja** — Tworzona przyrostowo z kazdą fazą (nie na koniec). Kazdy plik w `docs/` opisuje jedno zagadnienie. Format: krotki opis → jak to dziala → jak zmodyfikowac/rozszerzyc → przyklady. `admin-guide.md` jest pisany dla osoby nietechnicznej. Dokumentacja aktualizowana przy kazdej zmianie kodu, ktora zmienia zachowanie opisane w docs.

12. **Dostepnosc (WCAG 2.1 AA)** — Semantyczny HTML, atrybuty ARIA na komponentach interaktywnych (formularz rezerwacji, menu, przelaczniki), focus management, kontrast kolorow min. 4.5:1, alt text na wszystkich grafikach. Audyt Lighthouse Accessibility > 90.

13. **Customer Journey** — Glowny flow: odkrycie (SEO/direct) → landing page (hero) → eksploracja sekcji → decyzja (cennik + dostepnosc) → rezerwacja (formularz) → potwierdzenie (email) → zatwierdzenie admina (email) → pobyt → opcjonalnie: follow-up. Kazdy punkt kontaktu musi byc przejrzysty i dzialac na mobile.

14. **Integracje zewnetrzne** — Platnosci (Stripe/Przelewy24) i CRM sa poza zakresem obecnego planu. Moga byc realizowane jako osobny etap po MVP. Schemat DB zachowuje pola `isPaid` i statusy `DEPOSIT_PAID`/`PAID` na przyszlosc, ale nie implementujemy integracji platniczej.

15. **Przekazanie projektu** — Na zakonczenie Fazy 6 przygotowywany jest pelny pakiet: dokumentacja techniczna, poradnik admina, dane dostepu, instrukcja utrzymania. Calosc przekazywana zleceniodawcy.

16. **Struktura serwisu (drzewo stron)** — Model `Page` z self-relacja `parentId` tworzy drzewo hierarchiczne. Kazda strona ma unikaly `slug` (pelna sciezka URL, np. `oferta/apartament-1`). Sekcje (`Section`) naleza do stron (`pageId`). Strona glowna ma `isHome: true`. Routing: `app/[...slug]/page.tsx` (catch-all) pobiera strone z DB po slug, renderuje jej sekcje. Nawigacja generowana automatycznie z drzewa stron. Wizualizacja: React Flow (xyflow) — jedyna nowa zaleznosc, uzasadniona brakiem rozsadnej alternatywy dla grafow wezlow.
