# HOMMM — Stage 2: Plan implementacji

> **Data:** 2026-03-28
> **Źródła:** `claude/admin_UI.md` (audyt UI/UX), `claude/ocena-systemu-rezerwacji-HOMMM.md` (test rezerwacji)
> **Stan wyjściowy:** Działający panel admina z Next.js 15 + Prisma 7 + Neon PostgreSQL + Vercel Blob

---

## Legenda priorytetów

| Tag | Znaczenie | Czas |
|-----|-----------|------|
| **P0** | Krytyczne — blokuje użytkowanie | Natychmiast |
| **P1** | Wysokie — kluczowe dla wartości biznesowej | 2-4 tyg. |
| **P2** | Średnie — poprawa jakości | 1-2 mies. |
| **P3** | Niskie — przyszłość | Backlog |

---

## FAZA A — P0: Naprawy krytyczne

### A1. Naprawa obliczeń KPI na Dashboard

**Problem:** Obłożenie >100% (np. 890%), przychód miesięczny = roczny.

**Pliki do zmiany:**
- `app/admin/dashboard/page.tsx` → funkcja `getStats()`

**Co zmienić:**

1. **Obliczenie obłożenia** — obecny kod sumuje pole `nights` z rezerwacji, które mają `checkIn >= startOfMonth`. To błąd, bo rezerwacja 14-nocowa z checkIn w marcu liczy 14 nocy dla marca, nawet jeśli checkout jest w kwietniu.

   Nowa logika:
   ```
   Dla każdej rezerwacji (status: DEPOSIT_PAID | PAID | COMPLETED):
     overlap_start = max(checkIn, startOfMonth)
     overlap_end   = min(checkOut, endOfMonth + 1 day)
     noce_w_miesiącu = max(0, diff_in_days(overlap_start, overlap_end))

   oblozenie = sum(noce_w_miesiącu) / dni_w_miesiącu × 100%
   Cap na 100% (jeden domek, nie mogą się nakładać)
   ```

2. **Przychód** — obecny filtr `checkIn >= startOfMonth` pomija rezerwacje, które zaczęły się przed bieżącym miesiącem, ale trwają w jego trakcie.

   Nowa logika (proporcjonalny przychód):
   ```
   przychod_miesiac = SUM(
     totalPrice × (noce_w_miesiącu / nights)
   ) WHERE status IN (DEPOSIT_PAID, PAID, COMPLETED)
     AND checkIn < endOfMonth AND checkOut > startOfMonth
   ```

   Analogicznie dla przychodu rocznego — uwzględnić rezerwacje, których zakres dat zachodzi na bieżący rok.

3. **Uwzględniać tylko potwierdzone statusy** — `DEPOSIT_PAID`, `PAID`, `COMPLETED`. Obecny kod filtruje `status: { not: 'CANCELLED' }`, co wlicza PENDING do obłożenia i przychodów.

**Weryfikacja:**
- Ręcznie: Dashboard → KPI: obłożenie ≤ 100%, przychód miesięczny ≤ roczny.
- Dodać testową rezerwację 14 nocy na przełomie miesięcy → sprawdzić, czy obłożenie dzieli się proporcjonalnie.

---

### A2. Filtry, sortowanie i paginacja w panelu Rezerwacje

**Problem:** Tabela wyświetla max 100 rezerwacji bez filtrów, sortowania, i paginacji. Backend (`actions/reservations.ts`) JUŻ obsługuje `status`, `search`, `page`, `perPage` — ale frontend ich nie używa.

**Pliki do zmiany:**
- `app/admin/reservations/page.tsx` — przepisać na klient-server hybrid z filtrami

**Podejście:**

1. Wydzielić komponent kliencki `ReservationsClient.tsx` (filtry + tabela):
   ```
   Filtry (nad tabelą):
   - Dropdown status (multi-select): Oczekująca, Zaliczka, Opłacona, Zakończona, Anulowana
   - Pole tekstowe "Szukaj" (imię, email, telefon)
   - Paginacja na dole: 20 per strona, nawigacja Poprzednia/Następna + info "Strona X z Y"
   ```

2. Sortowanie — dodać do `actions/reservations.ts` parametr `sortBy` + `sortDir`:
   - Obsługiwane kolumny: `checkIn`, `checkOut`, `totalPrice`, `createdAt`, `guests`, `nights`
   - Domyślne: `createdAt desc`
   - Frontend: kliknięcie na nagłówek kolumny przełącza sortowanie

3. Karty statystyk na górze → linkować do filtrowanych widoków:
   - Kliknięcie "Oczekujące (29)" → ustawia filtr `status=PENDING`

**Weryfikacja:** Wybrać filtr "Oczekująca" → tabela pokazuje tylko oczekujące. Kliknąć kolumnę "Cena" → posortowane malejąco.

---

### A3. Poprawa widoku szczegółów rezerwacji

**Obecny stan:** Strona `app/admin/reservations/[id]/page.tsx` + `ReservationActions.tsx` JUŻ istnieje z: dane gościa, szczegóły pobytu, zmiana statusu, notatki admina.

**Brakujące elementy do dodania:**

1. **Edycja dat i ceny** — dodać tryb edycji w `ReservationActions.tsx`:
   - Edytowalne: checkIn, checkOut, guests, totalPrice (z auto-przeliczeniem)
   - Nowa akcja w `actions/reservations.ts`: `updateReservation(id, data)`
   - Walidacja: nie pozwolić na daty nakładające się z innymi rezerwacjami

2. **Sekcja płatności** (pod szczegółami pobytu):
   - Kwota zaliczki wymaganej (% z ustawień — patrz C1)
   - Status płatności: badge z tekstem
   - Pole "Data wpłaty zaliczki" (nowe pole w DB — patrz schemat)

3. **Historia zmian statusu** — nowa tabela `StatusHistory`:
   - Przy każdej zmianie statusu → zapisz wpis (oldStatus, newStatus, changedAt, changedBy)
   - Wyświetlić jako timeline pod notatką admina

**Zmiany w DB (Prisma schema):**
```prisma
model StatusHistory {
  id            String   @id @default(cuid())
  reservationId String
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  oldStatus     ReservationStatus
  newStatus     ReservationStatus
  changedBy     String?  // email admina
  createdAt     DateTime @default(now())

  @@index([reservationId])
}

// Dodać w Reservation:
  statusHistory StatusHistory[]
  depositAmount Float?
  depositPaidAt DateTime?
```

**Weryfikacja:** Zmienić status rezerwacji → historia pokazuje wpis z datą i adminem.

---

## FAZA B — P1: Kluczowe funkcje biznesowe

### B1. Wykres obłożenia (dni zajęte/wolne) zamiast "liczba rezerwacji"

**Problem:** Wykres słupkowy w Dashboard pokazuje liczbę rezerwacji per miesiąc — mało użyteczne dla 1 domku.

**Pliki do zmiany:**
- `app/admin/dashboard/page.tsx` → dane wykresu w `getStats()`
- `app/admin/dashboard/ReservationsChart.tsx` → wizualizacja

**Nowa logika danych:**
```
Dla każdego miesiąca (Sty–Gru):
  dni_zajęte    = suma dni z rezerwacji DEPOSIT_PAID + PAID + COMPLETED
  dni_oczekujące = suma dni z rezerwacji PENDING
  dni_zablokowane = count BlockedDate w tym miesiącu
  dni_wolne     = dni_w_miesiącu - dni_zajęte - dni_oczekujące - dni_zablokowane

  (overlap logic jak w A1)
```

**Wykres:**
- Typ: Stacked bar chart (Recharts `<BarChart>` — już w projekcie)
- Oś X: miesiące, Oś Y: 0–31 dni
- Kolory: zielony (zajęte), żółty (oczekujące), czerwony (zablokowane), szary (wolne)
- Tooltip z dokładnymi liczbami

**Weryfikacja:** Wykres dla miesiąca z 3 rezerwacjami po 5 nocy = 15 dni zajętych, reszta wolna.

---

### B2. Nowe KPI na Dashboard

**Pliki do zmiany:**
- `app/admin/dashboard/page.tsx` → rozszerzyć `getStats()`

**Nowe wskaźniki:**

| KPI | Formuła | Lokalizacja |
|-----|---------|-------------|
| Średnia cena za noc | `SUM(totalPrice) / SUM(nights)` dla DEPOSIT_PAID+PAID+COMPLETED | Sekcja KPI |
| Średnia długość pobytu | `SUM(nights) / COUNT(rezerwacje)` (potwierdzone) | Sekcja KPI |
| Konwersja | `COUNT(PAID+COMPLETED) / COUNT(ALL) × 100%` | Sekcja KPI |
| Wskaźnik anulacji | `COUNT(CANCELLED) / COUNT(ALL) × 100%` | Sekcja KPI |
| Przychód prognozowany | `SUM(totalPrice)` WHERE DEPOSIT_PAID AND checkIn > dziś | Sekcja KPI |
| Nadchodzące (7 dni) | `COUNT` WHERE checkIn w ciągu 7 dni AND status ≠ CANCELLED | Karty rezerwacji |

**Dodać kartę "Nadchodzące (7 dni)"** w sekcji kart rezerwacji (przed "Oczekujące").

**Weryfikacja:** Porównać ręcznie wyliczone wartości z wyświetlanymi.

---

### B3. Cennik dynamiczny (sezonowy/weekendowy)

**Problem:** Jedna stała cena za noc (204,5 zł). Brak ceny weekendowej, sezonowej, minimalnego pobytu.

**Pliki do zmiany:**
- `actions/settings.ts` → rozszerzyć `SiteSettingsMap`
- `app/admin/settings/client.tsx` → nowa sekcja formularza
- `app/api/reservations/route.ts` → logika kalkulacji ceny
- `components/ReservationModal.tsx` → dynamiczna kalkulacja ceny po stronie klienta

**Nowe pola w `SiteSettingsMap`:**
```ts
// Dodać do typu i DEFAULTS:
priceWeekend: number;        // 0 = brak różnicy
priceSeasonHigh: number;     // 0 = brak
priceSeasonLow: number;      // 0 = brak
seasonHighStart: string;     // 'MM-DD', np. '06-01'
seasonHighEnd: string;       // 'MM-DD', np. '09-30'
minNights: number;           // domyślnie 2
minNightsWeekend: number;    // domyślnie 2
extraGuestFee: number;       // opłata za >X gości
extraGuestThreshold: number; // próg, np. 4
longStayDiscount: number;    // % rabatu za >7 nocy
longStayThreshold: number;   // próg nocy, np. 7
```

**Logika kalkulacji ceny (helper `lib/pricing.ts`):**
```
Dla każdej nocy w zakresie rezerwacji:
  1. Sprawdź, czy to sezon wysoki → użyj priceSeasonHigh (jeśli > 0)
  2. Sprawdź, czy to piątek/sobota → użyj priceWeekend (jeśli > 0)
  3. Inaczej → użyj pricePerNight (lub priceSeasonLow)

  sum = suma cen za noce
  if guests > extraGuestThreshold: sum += (guests - threshold) × extraGuestFee × nights
  if nights >= longStayThreshold: sum -= sum × longStayDiscount / 100
```

**Walidacja minimalnego pobytu:**
- API i formularz: odmowa jeśli `nights < minNights`
- Dla weekendów (pt-nd): odmowa jeśli `nights < minNightsWeekend`

**Weryfikacja:** Zarezerwować pobyt piątek-niedziela w lipcu → cena = weekendowa sezon wysoki.

---

### B4. Ulepszenie kalendarza

**Pliki do zmiany:**
- `app/admin/calendar/CalendarView.tsx`

**Zmiany:**

1. **Tooltip na rezerwacji** — przy hover na pasku rezerwacji:
   ```
   Imię gościa
   Daty: 29.03–31.03
   Status: Oczekująca
   Cena: 1 636 zł
   Goście: 1
   ```
   Implementacja: prosty `<div>` z absolute positioning przy onMouseEnter/Leave.

2. **Etykieta formatu** — zamiast samego imienia: `"{Imię} ({nights}n)"` z kolorem tła wg statusu.

3. **Blokowanie dat przeszłych** — dodać `disabled` na komórkach z datą < dzisiaj.

4. **Przycisk "Dziś"** — szybki powrót do bieżącego miesiąca.

**Weryfikacja:** Najechać na rezerwację → tooltip z danymi. Kliknąć datę z przeszłości → nic się nie dzieje.

---

### B5. Akcje "Wyślij email do gościa" z widoku rezerwacji

**Pliki do zmiany:**
- `app/admin/reservations/[id]/ReservationActions.tsx` — dodać przycisk
- `actions/reservations.ts` — nowa akcja `sendGuestEmail(id, templateType)`

**Logika:**
- Przycisk "Wyślij email" otwiera dropdown z typami szablonów (Potwierdzenie, Zaliczka, Anulowanie, Po pobycie)
- Po wyborze → buduje email z szablonu (`buildStatusChangeEmail()`) → wysyła przez `sendEmail()`
- Toast z informacją zwrotną (wysłano / błąd)

---

## FAZA C — P2: Ulepszenia jakości

### C1. Toast notification system

**Problem:** Brak feedbacku po zapisie (Ustawienia, SEO, Treści).

**Pliki do zmiany:**
- `app/admin/layout.tsx` — dodać `<Toaster />`
- Wszystkie formularze admina — zamienić `setMsg(...)` na `toast(...)`

**Implementacja:**
- Zainstalować `sonner` (lekka biblioteka toastów kompatybilna z shadcn/ui)
- Dodać komponent shadcn `<Toaster />` w layout
- Zamienić lokalne stany `msg` na `toast.success()` / `toast.error()`

---

### C2. Eksport danych rezerwacji (CSV)

**Pliki do zmiany:**
- `app/admin/reservations/page.tsx` → przycisk "Eksportuj"
- Nowy: `app/api/admin/reservations/export/route.ts`

**Logika:**
- Endpoint GET zwraca CSV z nagłówkami: Imię, Email, Telefon, Zameldowanie, Wymeldowanie, Noce, Goście, Cena, Status, Data zgłoszenia
- Filtruje wg tych samych kryteriów co widok (status, search, zakres dat)
- Response z `Content-Type: text/csv` + `Content-Disposition: attachment`
- Na froncie: przycisk "Eksportuj CSV" otwiera URL w nowej karcie

---

### C3. Testowy email w Mailingu

**Pliki do zmiany:**
- `app/admin/mailing/MailingEditor.tsx` — dodać przycisk "Wyślij testowy email"
- `actions/mailing.ts` — nowa akcja `sendTestEmail(templateKey)`

**Logika:**
- Pobiera aktualny szablon, interpoluje zmienne przykładowymi danymi
- Wysyła na email admina z `getSettings().contactEmail`
- Toast z wynikiem

---

### C4. Badge powiadomień w sidebarze

**Pliki do zmiany:**
- `components/admin/AdminShell.tsx`

**Logika:**
- Przy ładowaniu AdminShell: fetch do nowego endpointu `/api/admin/notifications`
- Endpoint zwraca: `{ pendingReservations: number, upcomingCheckIns48h: number }`
- Badge (czerwone kółko z liczbą) przy "Rezerwacje" i "Kalendarz"
- Wyświetlać tylko jeśli wartość > 0

---

### C5. Ulepszenie SEO — podgląd SERP i licznik znaków

**Pliki do zmiany:**
- `app/admin/seo/SeoForm.tsx`

**Dodać:**
1. **Google SERP preview** — komponent pod polami tytułu i opisu:
   ```
   <div class="serp-preview">
     <div class="text-blue-600 text-lg">{title || "HOMMM — Domek w naturze"}</div>
     <div class="text-green-700 text-sm">homme-two.vercel.app</div>
     <div class="text-sm text-gray-600">{description || "Opis strony..."}</div>
   </div>
   ```

2. **Licznik znaków** — pod polami input:
   - Tytuł: `X/60` z kolorami (zielony ≤60, żółty 61-70, czerwony >70)
   - Opis: `X/160` z kolorami (zielony ≤160, żółty 161-180, czerwony >180)

---

### C6. Przebudowa sekcji Infrastruktura na Dashboard

**Problem:** Karty Vercel/Neon/Umami to dane deweloperskie, nie biznesowe.

**Pliki do zmiany:**
- `app/admin/dashboard/page.tsx`
- `app/admin/dashboard/ExternalStatsCards.tsx`

**Zmiana:** Schować za przełącznikiem "Widok deweloperski" (domyślnie wyłączony). Ponad sekcją infrastruktury dodać:
- **Nadchodzące zameldowania** (lista 3 najbliższych rezerwacji z datą i imieniem)
- **Alerty** (np. "Rezerwacja za 3 dni — brak wpłaty zaliczki")

---

## FAZA D — P3: Nowe panele i funkcje zaawansowane

### D1. Panel Klienci (`/admin/clients`)

**Nowe pliki:**
- `app/admin/clients/page.tsx` — lista klientów
- `app/admin/clients/[id]/page.tsx` — szczegóły klienta
- `actions/clients.ts` — CRUD + wyszukiwanie

**Zmiany w DB:**
```prisma
model Client {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  phone        String?
  address      String?
  locale       String   @default("pl")   // pl | en
  rating       Int?     // 1-5 gwiazdek (ocena admina)
  tags         String   @default("[]")    // JSON: ["VIP","Powracający"]
  adminNote    String?
  discount     Float    @default(0)       // % rabatu indywidualnego
  isBlacklisted Boolean @default(false)
  blacklistReason String?
  reservations Reservation[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Dodać w Reservation:
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])
```

**Automatyczne tworzenie profili:**
- Przy nowej rezerwacji (`app/api/reservations/route.ts`): findOrCreate Client po emailu
- Przypisz `clientId` do rezerwacji

**Widok listy:**
- Kolumny: Imię, Email, Rezerwacje (count), Łączna kwota, Ostatni pobyt, Ocena, Tagi
- Filtry: szukaj, tagi, blacklista, sortowanie po wartości
- Kliknięcie → szczegóły z historią rezerwacji

**Sidebar:** Dodać "Klienci" (ikona `Users`) między "Rezerwacje" a "Kalendarz" w `AdminShell.tsx`.

---

### D2. Panel Raporty (`/admin/reports`)

**Nowe pliki:**
- `app/admin/reports/page.tsx`
- `actions/reports.ts`

**Raporty:**
1. **Raport miesięczny** — przychód, rezerwacje, obłożenie, średnia cena, porównanie z poprzednim miesiącem
2. **Raport roczny** — przychód miesięcznie (wykres liniowy), sezonowość, top klienci
3. **Eksport PDF** — użyć biblioteki do generacji PDF po stronie serwera (np. `@react-pdf/renderer`) lub prostsze rozwiązanie: print-friendly CSS + `window.print()`

**Sidebar:** Dodać "Raporty" (ikona `BarChart3`) po "Kalendarz".

---

### D3. Responsywność mobilna panelu admina

**Pliki do zmiany:**
- `app/admin/reservations/page.tsx` — tabela → karty na mobile
- `app/admin/calendar/CalendarView.tsx` — uproszczony widok dnia na mobile
- `app/admin/dashboard/page.tsx` — KPI grid responsive

**Podejście:**
- Tabele rezerwacji: na `sm:` przełączać na widok kart (każda rezerwacja = karta z kluczowymi danymi)
- Kalendarz: na mobile → widok listy nadchodzących rezerwacji zamiast siatki
- KPI: już są responsive (`sm:grid-cols-2 lg:grid-cols-3`) — sprawdzić na rzeczywistym urządzeniu

---

### D4. Synchronizacja iCal (Booking/Airbnb)

**Nowe pliki:**
- `app/api/ical/export/route.ts` — endpoint generujący plik .ics
- `actions/ical.ts` — import z zewnętrznych kalendarzy

**Export:**
- Generuj plik .ics ze wszystkimi potwierdzonymi rezerwacjami + zablokowanymi datami
- URL publiczny (z tokenem): `/api/ical/export?token=xxx`
- Do wklejenia w Google Calendar / Booking.com

**Import (przyszłość):**
- Pobieranie .ics z Booking.com/Airbnb co godzinę (cron)
- Tworzenie rezerwacji lub blokad z zewnętrznych kalendarzy
- Deduplication po dacie + source

---

### D5. Kolejność menu w sidebarze

**Plik:** `components/admin/AdminShell.tsx`

**Zmiana tablicy `OTHER_NAV_ITEMS`:**
```
Dashboard
Rezerwacje        ← (przesunąć wyżej)
Kalendarz         ← (przesunąć wyżej)
Klienci           ← (NOWY, po D1)
Raporty           ← (NOWY, po D2)
---separator---
Treści (▸)
Galeria
Mailing
---separator---
Struktura
SEO
Ustawienia
```

---

## FAZA E — Poprawki strony publicznej (z testu rezerwacji)

### E1. Usunięcie tekstu "Lorem ipsum"

**Plik:** Sekcja rezerwacji w CMS (`Section` z slug `rezerwacja`)
- Sprawdzić `contentPl` i `contentEn` w DB → usunąć placeholder
- Alternatywnie: edycja z panelu admina `/admin/content/rezerwacja`

### E2. Blokowanie dat przeszłych w kalendarzu publicznym

**Plik:** `components/ReservationModal.tsx` (lub komponent kalendarza publicznego)
- Dodać `disabled` na datach < dzisiaj
- Uniemożliwić nawigację do miesięcy z przeszłości

### E3. Ekran podsumowania przed wysłaniem rezerwacji

**Plik:** `components/ReservationModal.tsx`
- Po wyborze dat i kliknięciu "REZERWUJ" → wyświetlić krok podsumowania:
  ```
  Zameldowanie: 29.03.2026
  Wymeldowanie: 31.03.2026
  Noce: 2
  Goście: 2
  Cena: 409 zł

  [Potwierdź i przejdź do formularza] [Wróć]
  ```
- Dopiero po potwierdzeniu → formularz kontaktowy

### E4. Walidacja formularza rezerwacji

**Plik:** `components/ReservationModal.tsx`
- Telefon: regex dla polskiego numeru (`/^\+?[0-9\s-]{9,15}$/`)
- Email: bardziej restrykcyjna walidacja (nie tylko HTML5 type=email)
- Wyraźne komunikaty błędów w języku polskim

### E5. Komunikat "wybierz datę wymeldowania"

**Plik:** `components/ReservationModal.tsx`
- Po kliknięciu daty check-in → wyświetlić komunikat: "Teraz wybierz datę wymeldowania"
- Wizualne podświetlenie wybranej daty check-in

---

## Kolejność implementacji (sugerowana)

```
Tydzień 1:   A1 (KPI fix)
             A2 (filtry + sortowanie rezerwacji)
             E1 (Lorem ipsum)

Tydzień 2:   A3 (szczegóły rezerwacji — edycja, historia statusów)
             C1 (toast notifications)
             E2 + E5 (blokada dat, komunikat checkout)

Tydzień 3:   B1 (wykres obłożenia)
             B2 (nowe KPI)
             E3 (podsumowanie przed rezerwacją)

Tydzień 4:   B3 (cennik dynamiczny)
             B4 (kalendarz — tooltip, blokada przeszłych dat)
             E4 (walidacja formularza)

Tydzień 5-6: B5 (email z widoku rezerwacji)
             C2 (eksport CSV)
             C3 (testowy email)
             C4 (badge powiadomień)

Tydzień 7-8: C5 (SEO preview)
             C6 (alerty na Dashboard)
             D5 (kolejność menu)

Backlog:     D1 (panel Klienci)
             D2 (panel Raporty)
             D3 (responsywność mobilna)
             D4 (iCal sync)
```

---

## Zmiany w bazie danych — podsumowanie migracji

Wszystkie zmiany DB w jednym miejscu (dla ułatwienia planowania migracji):

```prisma
// NOWE MODELE:

model StatusHistory {
  id            String            @id @default(cuid())
  reservationId String
  reservation   Reservation       @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  oldStatus     ReservationStatus
  newStatus     ReservationStatus
  changedBy     String?
  createdAt     DateTime          @default(now())
  @@index([reservationId])
}

model Client {
  id              String        @id @default(cuid())
  email           String        @unique
  name            String
  phone           String?
  address         String?
  locale          String        @default("pl")
  rating          Int?
  tags            String        @default("[]")
  adminNote       String?
  discount        Float         @default(0)
  isBlacklisted   Boolean       @default(false)
  blacklistReason String?
  reservations    Reservation[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// ZMIANY W ISTNIEJĄCYCH MODELACH:

// Reservation — dodać:
  depositAmount   Float?
  depositPaidAt   DateTime?
  clientId        String?
  client          Client?         @relation(fields: [clientId], references: [id])
  statusHistory   StatusHistory[]
```

**Sugerowane migracje:**
1. Migracja A3: `StatusHistory` + pola `depositAmount`, `depositPaidAt` w Reservation
2. Migracja D1: `Client` + pole `clientId` w Reservation (nullable, bo istniejące rezerwacje nie mają klientów)

---

## Nowe zależności npm

| Paczka | Cel | Faza |
|--------|-----|------|
| `sonner` | Toast notifications | C1 |

Uwaga: Nie dodawać paczek bez potrzeby. Recharts już jest w projekcie (wykres). Sonner to jedyna nowa zależność — reszta zmian opiera się na istniejącym stacku.

---

## Notatki implementacyjne

1. **Nie usuwać `force-dynamic`** z istniejących stron admina — dane muszą być świeże.
2. **Server Actions** — preferować je nad Route Handlers tam, gdzie nie potrzeba publicznego API.
3. **Każda zmiana UI** — uwzględnić stany loading/empty/error (skeleton loadery dla danych async).
4. **Testy manualne** — po każdej fazie: sprawdzić dashboard KPI, rezerwacje, kalendarz, i formularz publiczny.
5. **Migracje DB** — uruchamiać `npx prisma migrate dev` lokalnie, `npx prisma migrate deploy` na produkcji.
