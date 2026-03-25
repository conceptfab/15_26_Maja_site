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
| SEO / Analytics | Brak | Brak GA, brak zarzadzania meta |

---

## Wybor technologii

### Backend & infrastruktura

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| API | **Next.js API Routes (App Router)** | Juz uzywany; zero nowego frameworka; deploy na Vercel natywny |
| Baza danych | **PostgreSQL** (Neon / Supabase) | Relacyjna, idealna do rezerwacji i kalendarza; darmowy tier na Neon |
| ORM | **Prisma** | Typowany schemat, migracje, integracja z Next.js |
| Autentykacja | **Custom JWT + secret code** | Prosta logika: whitelist emaili + tajny kod; bez ciezkich bibliotek |
| Email | **Resend** | Prosty API, darmowy tier 100 maili/dzien, integracja z React Email |
| CMS (tresc) | **Custom admin panel** + Prisma | JSON-based content w DB; edytor w panelu admina |
| i18n | **next-intl** | Lekki, natywny dla App Router, obsluga PL/ENG |
| Optymalizacja grafik | **Sharp** + Next.js Image | Automatyczna konwersja do WebP, generowanie wariantow |
| Analytics | **Google Analytics 4** + **Vercel Analytics** | GA4 do SEO/marketingu; Vercel Analytics do statystyk technicznych |
| Walidacja formularzy | **Zod** | Typowana walidacja na froncie i backendzie |
| UI panelu admina | **Tailwind CSS** + komponenty custom | Profesjonalny dashboard; bez dodatkowej biblioteki UI |
| Hosting | **Vercel** (frontend + API) + **Neon** (DB) | Darmowy tier, natywna integracja z Next.js |

---

## Architektura systemu

```
HOMMM Site
|
|-- Public (frontend)
|   |-- / .................. Strona glowna (istniejaca)
|   |-- /[locale]/ ......... Routing jezykowy (PL/ENG)
|
|-- Admin Panel (frontend)
|   |-- /admin/login ....... Logowanie (secret code + email)
|   |-- /admin/dashboard ... Glowny panel ze statystykami
|   |-- /admin/content ..... Edycja tresci sekcji (PL/ENG)
|   |-- /admin/gallery ..... Zarzadzanie galeria i grafikami
|   |-- /admin/reservations  Lista rezerwacji + zatwierdzanie
|   |-- /admin/calendar .... Kalendarz dostepnosci
|   |-- /admin/seo ......... Ustawienia SEO i meta tagow
|   |-- /admin/settings .... Ustawienia globalne strony
|
|-- API Routes
|   |-- /api/auth .......... Logowanie, sesja, wylogowanie
|   |-- /api/content ....... CRUD tresci sekcji
|   |-- /api/reservations .. CRUD rezerwacji
|   |-- /api/gallery ....... Upload i zarzadzanie grafikami
|   |-- /api/seo ........... Ustawienia SEO
|   |-- /api/stats ......... Statystyki rezerwacji/wynajmu
|   |-- /api/upload ........ Upload + optymalizacja obrazow
|
|-- Database (PostgreSQL)
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
  PENDING      // Wstępna (Oczekująca na zatwierdzenie) - BLOKUJE TERMIN
  DEPOSIT_PAID // Opłacona zaliczka - BLOKUJE TERMIN
  PAID         // Opłacona całość - BLOKUJE TERMIN
  CANCELLED    // Anulowana
  COMPLETED    // Zakończona (po pobycie)
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
  gaTrackingId    String?                // Google Analytics ID
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
   prisma, @prisma/client, zod, jsonwebtoken, bcryptjs,
   next-intl, resend, sharp, tailwindcss (jesli brak)
   ```

2. **Konfiguracja Prisma + PostgreSQL**
   - Plik `prisma/schema.prisma` z pelnym schematem
   - Konfiguracja `.env` (DATABASE_URL, JWT_SECRET, ADMIN_SECRET_CODE)
   - Migracja inicjalna

3. **System autentykacji admina**
   - `POST /api/auth/login` - email + secret code -> JWT token
   - `POST /api/auth/logout` - uniewaznij sesje
   - `GET /api/auth/me` - sprawdz aktualna sesje
   - Middleware sprawdzajacy JWT na `/admin/*` i `/api/*` (oprocz login)
   - Whitelist emaili w tabeli `Admin`
   - Token w httpOnly cookie

4. **Layout panelu admina**
   - `/admin/layout.tsx` - sidebar, topbar, responsywny dashboard layout
   - `/admin/login/page.tsx` - formularz logowania
   - `/admin/dashboard/page.tsx` - placeholder z nawigacja
   - Profesjonalny design: ciemny sidebar, jasna tresc, karty statystyk

5. **Konfiguracja Tailwind CSS** (jesli nie jest zainstalowany)

**Rezultat:** Admin moze sie zalogowac i zobaczyc pusty dashboard.

---

### FAZA 2: Zarzadzanie trescia (CMS)

**Cel:** Admin moze edytowac kazda sekcje strony w PL i ENG.

**Zadania:**

1. **API tresci**
   - `GET /api/content` - pobierz wszystkie sekcje
   - `GET /api/content/[slug]` - pobierz jedna sekcje
   - `PUT /api/content/[slug]` - aktualizuj sekcje (chronione)

2. **Panel edycji tresci**
   - `/admin/content/page.tsx` - lista sekcji z podgladem
   - `/admin/content/[slug]/page.tsx` - edytor sekcji
   - Edytor JSON z podgladem na zywo
   - Przelacznik PL / ENG
   - Wybor tla sekcji (kolor / obraz)
   - Zarzadzanie tagami

3. **Integracja i18n (next-intl)**
   - Konfiguracja `next-intl` z routing `/pl/` i `/en/`
   - Middleware do detekcji jezyka
   - Przeniesienie statycznych tekstow do plikow tlumaczen
   - Dynamiczne tresci z bazy danych wg aktywnego jezyka

4. **Refaktor frontendu**
   - Strona glowna pobiera tresc z API zamiast hardcoded
   - Fallback na statyczna tresc jesli API niedostepne
   - Obsluga przelacznika PL/ENG w TopMenu

**Rezultat:** Pelna obsluga PL/ENG, admin edytuje tresc w panelu.

---

### FAZA 3: System rezerwacji (backend)

**Cel:** Pelny obieg rezerwacji z emailami i kalendarzem.

**Zadania:**

1. **API rezerwacji**
   - `POST /api/reservations` - utworz rezerwacje (publiczny)
     - Walidacja: daty, liczba gosci, email, telefon, komentarz
     - Sprawdzenie dostepnosci terminu
     - Wyslanie emaila do goscia (potwierdzenie zgloszenia)
     - Wyslanie emaila do admina (powiadomienie)
   - `GET /api/reservations` - lista rezerwacji (admin)
   - `GET /api/reservations/[id]` - szczegoly (admin)
   - `PATCH /api/reservations/[id]` - zmien status (admin)
   - `GET /api/reservations/availability` - sprawdz dostepnosc (publiczny)

2. **Refaktor formularza rezerwacji**
   - Dodanie pol: imie, email, telefon, komentarz
   - Walidacja po stronie klienta (Zod)
   - Wysylka do API zamiast mailto:
   - Wyswietlanie dostepnosci w kalendarzu (zablokowane daty)
   - Potwierdzenie po wyslaniu

3. **Szablony email (React Email + Resend)**
   - Email do goscia: "Otrzymalismy Twoja rezerwacje"
   - Email do admina: "Nowa rezerwacja od [imie]"
   - Email do goscia: "Rezerwacja potwierdzona" (po zatwierdzeniu)
   - Email do goscia: "Rezerwacja anulowana"

4. **Panel admina - rezerwacje**
   - `/admin/reservations/page.tsx` - tabela rezerwacji z filtrami
     - Filtry: status, daty, szukaj po nazwisku/emailu
     - Akcje: zatwierdz, oznacz jako oplacona, anuluj
   - `/admin/reservations/[id]/page.tsx` - szczegoly rezerwacji
   - `/admin/calendar/page.tsx` - widok kalendarza z zajetymi terminami
     - Kolorowanie wg statusu (oczekujace, potwierdzone, oplacone)
     - Mozliwosc recznego blokowania terminow

**Rezultat:** Pelny obieg rezerwacji: gosc -> email -> admin zatwierdza -> kalendarz blokuje termin.

---

### FAZA 4: Galeria i optymalizacja grafik

**Cel:** Zarzadzanie galeria z automatyczna optymalizacja do WebP.

**Zadania:**

1. **API uploadow**
   - `POST /api/upload` - upload grafiki (admin)
     - Przetwarzanie przez Sharp: resize, konwersja do WebP, generowanie miniatur
     - Zapis oryginalow i zoptymalizowanych wersji
     - Zwrot URLi (original, webp, thumb)
   - `DELETE /api/upload/[id]` - usun grafike

2. **Panel galerii**
   - `/admin/gallery/page.tsx` - grid z miniaturami
   - Drag & drop upload
   - Zmiana kolejnosci (drag & drop)
   - Edycja alt text (PL/ENG)
   - Podglad oryginal vs WebP z rozmiarem pliku
   - Przypisanie do sekcji

3. **Zarzadzanie tlami sekcji**
   - Wybor z galerii lub upload nowego tla
   - Podglad na zywo w edytorze sekcji

4. **Integracja z frontem**
   - Komponent galerii na stronie glownej (jesli potrzebny)
   - Tla sekcji ladowane z bazy
   - Next.js Image z automatycznym WebP

**Rezultat:** Admin uploaduje grafiki -> automatyczna optymalizacja -> wyswietlanie na stronie.

---

### FAZA 5: SEO, Analytics i statystyki

**Cel:** Zarzadzanie SEO, integracja Google Analytics, dashboard statystyk.

**Zadania:**

1. **SEO Management**
   - `GET/PUT /api/seo` - ustawienia SEO (admin)
   - `/admin/seo/page.tsx` - formularz edycji
     - Title i description (PL/ENG)
     - OG image
     - Custom head tags
     - Google Analytics Tracking ID
   - Dynamiczne `<head>` na stronie glownej na podstawie DB

2. **Google Analytics 4**
   - Komponent `<GoogleAnalytics />` w layout.tsx
   - Tracking ID z bazy danych (konfigurowalny w panelu)
   - Sledznie zdarzen: rezerwacja, zmiana jezyka, klikniecia menu

3. **Vercel Analytics** (opcjonalnie)
   - `@vercel/analytics` - Web Vitals i statystyki
   - Wyswietlanie w dashboardzie admina (link do Vercel)

4. **Dashboard statystyk rezerwacji**
   - `/admin/dashboard/page.tsx` - rozbudowany dashboard:
     - Liczba rezerwacji (wg statusu) - miesieczne/roczne
     - Przychod: potwierdzone + oplacone
     - Oblozenosc: procent zajetych dni w miesiacu
     - Srednia dlugosc pobytu
     - Najpopularniejsze terminy
     - Wykres rezerwacji w czasie (prosty chart - np. recharts)
   - `GET /api/stats` - agregowane dane statystyczne

**Rezultat:** Profesjonalny dashboard ze statystykami, SEO zarzadzane z panelu.

---

### FAZA 6: Ustawienia globalne i finalizacja

**Cel:** Konfiguracja globalna strony, testy, deploy.

**Zadania:**

1. **Ustawienia globalne**
   - `/admin/settings/page.tsx`
     - Cena za noc (obecnie hardcoded 204.5 PLN)
     - Maksymalna liczba gosci
     - Dane kontaktowe (email, telefon, social media)
     - Konfiguracja menu (kolejnosc, widocznosc sekcji)
     - Whitelist adminow (dodaj/usun email)

2. **Zabezpieczenia**
   - Rate limiting na API (szczegolnie login i rezerwacje)
   - CSRF protection
   - Sanityzacja inputow
   - Walidacja Zod na wszystkich endpointach
   - Bezpieczne httpOnly cookies

3. **Testy**
   - Testy API (rezerwacje, auth, content)
   - Test dostepnosci kalendarza (edge cases: nakladajace sie daty)
   - Test flow rezerwacji end-to-end

4. **Deploy na Vercel**
   - Konfiguracja zmiennych srodowiskowych
   - Polaczenie z Neon PostgreSQL
   - Konfiguracja domeny
   - Seed bazy danych (poczatkowa tresc, konto admina)

**Rezultat:** Gotowa aplikacja na produkcji.

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
|   |-- [locale]/                  // i18n routing
|   |   |-- layout.tsx
|   |   |-- page.tsx               // Strona glowna (refaktor)
|   |   |-- not-found.tsx
|   |
|   |-- admin/
|   |   |-- layout.tsx             // Dashboard layout (sidebar, topbar)
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
|   |   |-- content/
|   |   |   |-- route.ts           // GET all
|   |   |   |-- [slug]/route.ts    // GET/PUT one
|   |   |-- reservations/
|   |   |   |-- route.ts           // GET all / POST new
|   |   |   |-- [id]/route.ts      // GET/PATCH one
|   |   |   |-- availability/route.ts
|   |   |-- gallery/route.ts
|   |   |-- upload/route.ts
|   |   |-- seo/route.ts
|   |   |-- stats/route.ts
|   |
|   |-- globals.css
|
|-- components/
|   |-- TopMenu.tsx                // Istniejacy (rozszerzony o i18n)
|   |-- Icons.tsx                  // Istniejacy
|   |-- ReservationForm.tsx        // Wydzielony z page.tsx
|   |-- GoogleAnalytics.tsx
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
|   |-- auth.ts                    // JWT helpers, middleware
|   |-- mail.ts                    // Resend client + szablony
|   |-- image.ts                   // Sharp processing
|   |-- validations.ts             // Zod schemas
|
|-- emails/
|   |-- ReservationConfirmation.tsx // React Email template
|   |-- ReservationNotifyAdmin.tsx
|   |-- ReservationApproved.tsx
|   |-- ReservationCancelled.tsx
|
|-- messages/
|   |-- pl.json                    // Tlumaczenia PL
|   |-- en.json                    // Tlumaczenia ENG
|
|-- data/
|   |-- content.ts                 // Istniejacy (fallback)
|
|-- public/
|   |-- assets/                    // Istniejace grafiki
|   |-- uploads/                   // Uploadowane grafiki
```

---

## Zmienne srodowiskowe (.env)

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/hommm"

# Auth
JWT_SECRET="random-secret-min-32-chars"
ADMIN_SECRET_CODE="tajny-kod-dostepu-dla-adminow"

# Email (Resend)
RESEND_API_KEY="re_..."
ADMIN_EMAIL="hommm@hommm.eu"

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID="G-XXXXXXXXXX"

# App
NEXT_PUBLIC_BASE_URL="https://hommm.eu"
```

---

## Kolejnosc priorytetow

| Priorytet | Faza | Szacowany zakres |
|-----------|------|------------------|
| 1 (krytyczny) | Faza 1 - Fundament | DB + Auth + Layout admina |
| 2 (krytyczny) | Faza 3 - Rezerwacje | Caly obieg rezerwacji |
| 3 (wysoki) | Faza 2 - CMS + i18n | Edycja tresci PL/ENG |
| 4 (sredni) | Faza 4 - Galeria | Upload + optymalizacja WebP |
| 5 (sredni) | Faza 5 - SEO/Stats | Analytics + dashboard |
| 6 (niski) | Faza 6 - Finalizacja | Ustawienia + testy + deploy |

> Fazy 1 i 3 sa krytyczne - bez nich strona nie ma podstawowej funkcjonalnosci backendu.
> Faza 2 (CMS) moze byc czesciowo realizowana rownolegle z Faza 3.

---

## Uwagi implementacyjne

1. **Secret code auth** - Admin podaje email + tajny kod (wspolny dla wszystkich). Jesli email jest na whitelist i kod sie zgadza -> JWT token. Proste i bezpieczne dla malego zespolu.

2. **JSON content** - Tresc sekcji przechowywana jako JSON w Prisma (`Json` type). Pozwala na elastyczna strukture bez zmian schematu.

3. **Obsluga braku DB** - Frontend powinien miec fallback na statyczna tresc z `data/content.ts` gdy API jest niedostepne (np. podczas buildu).

4. **Optymalizacja grafik** - Sharp przetwarza przy uploadzie, nie przy kazdym uzyciu. Generuje 3 warianty: original, webp (max 1920px), thumb (400px).

5. **Kalendarz dostepnosci** - Rezerwacje ze statusem PENDING, DEPOSIT_PAID lub PAID blokuja daty. Uzytkownik widzi je jako "zajete", admin widzi szczegolowy status.

6. **Rate limiting** - Uzyc middleware Next.js lub biblioteke `rate-limiter-flexible` - szczegolnie na `/api/auth/login` i `/api/reservations`.
