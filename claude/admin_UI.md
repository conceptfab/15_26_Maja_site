# HOMMM Admin Panel — Audyt UI/UX i propozycje zmian

> **Data audytu:** 2026-03-28
> **URL panelu:** https://homme-two.vercel.app/admin/dashboard
> **Cel dokumentu:** Precyzyjny opis problemów UI/UX, brakujących danych, optymalizacji i nowych funkcjonalności. Każda zmiana jest opisana z lokalizacją w panelu, obecnym stanem i proponowanym rozwiązaniem — tak, aby kolejny model/deweloper mógł wdrożyć poprawki.

---

## SPIS TREŚCI

1. [Dashboard — Wykresy i KPI](#1-dashboard--wykresy-i-kpi)
2. [Dashboard — Sekcja Rezerwacje (karty)](#2-dashboard--sekcja-rezerwacje-karty)
3. [Dashboard — Sekcja Infrastruktura](#3-dashboard--sekcja-infrastruktura)
4. [Panel Rezerwacje](#4-panel-rezerwacje)
5. [Kalendarz](#5-kalendarz)
6. [Mailing](#6-mailing)
7. [Galeria](#7-galeria)
8. [Treści (CMS)](#8-treści-cms)
9. [Struktura serwisu](#9-struktura-serwisu)
10. [SEO i widoczność](#10-seo-i-widoczność)
11. [Ustawienia](#11-ustawienia)
12. [NOWY PANEL: Klienci](#12-nowy-panel-klienci)
13. [NOWY PANEL: Raporty finansowe](#13-nowy-panel-raporty-finansowe)
14. [Nawigacja boczna (Sidebar)](#14-nawigacja-boczna-sidebar)
15. [Ogólne problemy UI/UX](#15-ogólne-problemy-uiux)

---

## 1. Dashboard — Wykresy i KPI

### 1.1 KRYTYCZNE: Wykres „Rezerwacje 2026" — zmiana logiki

**Obecny stan:**
Wykres słupkowy pokazuje **liczbę rezerwacji** w każdym miesiącu (oś Y: 0–5), z podziałem na statusy (Oczekująca, Zaliczka, Opłacona, Anulowana, Zablokowana). Przełącznik: Miesiące / Tygodnie.

**Problem:**
Dla właściciela jednego domku liczba rezerwacji (np. 3–5 miesięcznie) jest mało użyteczną informacją. Ważniejsze jest **ile dni w miesiącu jest zajętych vs. wolnych**, bo to bezpośrednio przekłada się na przychód i planowanie.

**Proponowana zmiana — Wykres 1: Obłożenie (dni zajęte/wolne):**

```
Typ: Stacked bar chart (100% lub absolutny)
Oś X: Miesiące (Sty–Gru) lub Tygodnie
Oś Y: Liczba dni (0–31)
Słupki:
  - Kolor zielony: Dni zajęte (potwierdzone rezerwacje — Zaliczka + Opłacona)
  - Kolor żółty: Dni oczekujące (rezerwacje ze statusem Oczekująca)
  - Kolor szary: Dni wolne
  - Kolor czerwony: Dni zablokowane (ręczne blokady admina)
Tooltip: "Marzec 2026: 18 dni zajętych / 8 oczekujących / 3 wolne / 2 zablokowane"
```

**Lokalizacja w kodzie:** Komponent wykresu w stronie `/admin/dashboard`. Prawdopodobnie wykorzystuje bibliotekę typu Recharts lub Chart.js. Należy zmienić dane źródłowe — zamiast zliczania rezerwacji per miesiąc, trzeba obliczyć sumę noclegów (checkout - checkin w dniach) per status per miesiąc.

**Proponowana zmiana — Wykres 2 (NOWY): Peak wynajmu — heatmapa tygodniowa:**

```
Typ: Heatmap (siatka 7 kolumn × 52 wiersze) lub uproszczony bar chart
Dane: Dla każdego dnia tygodnia (Pn–Nd) — średnia zajętość w %
Cel: Pokazać, które dni tygodnia/weekendy są najczęściej rezerwowane
Kolory: od jasnego (mało rezerwacji) do ciemnego pomarańczowego (peak)
Alternatywa prostsza: Bar chart — oś X: Pn–Nd, oś Y: % zajętości
```

**Lokalizacja:** Dodać nowy komponent pod istniejącym wykresem na stronie Dashboard.

### 1.2 Wskaźniki KPI — błędy logiczne i brakujące dane

**Obecny stan:**
- Przychód (miesiąc): 56 446 zł
- Przychód (rok): 56 446 zł (identyczna wartość — wygląda na błąd)
- Obłożenie (miesiąc): 890% zajętych nocy (niemożliwa wartość)
- Obłożenie (rok): 317% zajętych nocy (niemożliwa wartość)

**Problemy:**
1. **Przychód miesięczny = roczny** → wygląda na to, że oba pobierają te same dane. Sprawdzić filtry dat w zapytaniu do bazy.
2. **Obłożenie 890%** → błąd w obliczeniach. Obłożenie powinno być obliczane jako: `(suma_noclegów_w_miesiącu / liczba_dni_w_miesiącu) × 100%`. Maksimum to 100%. Prawdopodobnie sumowane są noce ze WSZYSTKICH rezerwacji (w tym oczekujących), a może zliczany jest każdy gość osobno zamiast nocy.

**Proponowane poprawki:**

```
Formuła obłożenia:
  oblozenie_miesiac = (dni_z_potwierdzoną_rezerwacją / dni_w_miesiącu) × 100%

  Uwzględniać TYLKO statusy: Zaliczka, Opłacona (potwierdzone)
  NIE uwzględniać: Oczekująca, Anulowana, Zablokowana

Formuła przychodu:
  przychod_miesiac = SUM(cena) WHERE status IN ('zaliczka','oplacona')
                     AND (checkin >= pierwszy_dzien_miesiaca OR checkout <= ostatni_dzien_miesiaca)
  przychod_rok = SUM(cena) WHERE status IN ('zaliczka','oplacona')
                 AND YEAR(checkin) = biezacy_rok
```

### 1.3 NOWE KPI do dodania

**Brakujące wskaźniki, które są kluczowe dla właściciela:**

```
1. Średnia cena za noc (faktyczna vs. cennikowa)
   = SUM(cena) / SUM(noce) dla potwierdzonych rezerwacji
   Porównanie z ceną cennikową z Ustawień (204,5 zł)

2. Średnia długość pobytu
   = SUM(noce) / COUNT(rezerwacje) — ważne dla strategii cenowej

3. Konwersja rezerwacji
   = rezerwacje_opłacone / rezerwacje_łącznie × 100%
   Aktualnie: 0 opłaconych / 30 łącznie = 0% — sygnał alarmowy

4. Wskaźnik anulacji
   = rezerwacje_anulowane / rezerwacje_łącznie × 100%

5. Przychód prognozowany (nadchodzące potwierdzone rezerwacje)
   = SUM(cena) WHERE status IN ('zaliczka') AND checkin > dzisiaj
```

### 1.4 Śr. czas odpowiedzi — wyjaśnienie kontekstu

**Obecny stan:** „Śr. czas odpowiedzi: 0h — Od zgłoszenia do zmiany statusu"

**Problem:** Wartość 0h jest mało informacyjna. Brakuje wyjaśnienia, czy to dobrze, czy po prostu nie ma danych.

**Propozycja:**
- Pokazać trend (np. „0h ↓ z 2h w poprzednim miesiącu")
- Dodać kolorowy wskaźnik: zielony <1h, żółty 1-4h, czerwony >4h
- Jeśli brak danych → wyświetlić „Brak danych" zamiast „0h"

---

## 2. Dashboard — Sekcja Rezerwacje (karty)

**Obecny stan:**
6 kart: Łącznie (30), Oczekujące (29), Zaliczka (0), Opłacone (0), Zrealizowane (0), Anulowane (1)

**Problemy:**
1. **29 oczekujących rezerwacji i 0 opłaconych** — to krytyczny problem biznesowy. Dashboard powinien to wyraźniej sygnalizować (np. czerwony alert, nie tylko pomarańczowy banner na górze).
2. Brakuje karty **„Zablokowane"** — mimo że status ten jest w legendzie wykresu.
3. Brakuje karty **„Nadchodzące"** (w ciągu 7 dni) — najważniejsza informacja operacyjna.

**Proponowane zmiany:**

```
Dodać karty:
  - "Nadchodzące (7 dni)" — ile rezerwacji zaczyna się w ciągu tygodnia
  - "Zablokowane" — ile dat jest ręcznie zablokowanych

Zmienić kolejność kart wg ważności:
  Nadchodzące (7 dni) → Oczekujące → Zaliczka → Opłacone → Zrealizowane → Anulowane → Zablokowane

Kliknięcie na kartę → filtruje listę rezerwacji (przekierowanie do /admin/reservations?status=oczekujaca)
```

---

## 3. Dashboard — Sekcja Infrastruktura

**Obecny stan:**
3 karty: Umami (ruch), Vercel (deployments), Neon (baza danych)

**Ocena:** To jest sekcja deweloperska, nie biznesowa. Dla właściciela domku dane o deployments i storage bazy danych nie mają wartości.

**Propozycja:**
- Przenieść do osobnej podstrony `/admin/devtools` lub ukryć za przełącznikiem „Widok deweloperski"
- Na dashboardzie zastąpić bardziej użytecznymi danymi, np.:
  - Ostatnie opinie gości (jeśli zbierane)
  - Nadchodzące zameldowania
  - Alerty (np. brak opłaty za rezerwację, która zaczyna się za 3 dni)

---

## 4. Panel Rezerwacje

**Obecny stan:**
Tabela z kolumnami: Gość (imię + email), Zameldowanie, Wymeldowanie, Noce, Goście, Cena, Status, Data zgł.
Karty na górze: Łącznie (30), Oczekujące (29), Nadchodzące (28).

### 4.1 Brakująca interakcja — kliknięcie na rezerwację

**Problem:** Kliknięcie na wiersz rezerwacji **nie otwiera żadnego widoku szczegółowego**. To krytyczny brak — admin nie może:
- Zmienić statusu rezerwacji
- Dodać notatki
- Zobaczyć historii zmian
- Skontaktować się z gościem
- Wystawić faktury

**Proponowana zmiana:**

```
Kliknięcie na wiersz → otwiera panel boczny (drawer) lub modal z:

Sekcja "Dane rezerwacji":
  - Status (dropdown: Oczekująca → Zaliczka → Opłacona → Zrealizowana → Anulowana)
  - Daty zameldowania/wymeldowania (edytowalne)
  - Liczba nocy (auto-kalkulacja)
  - Liczba gości (edytowalna)
  - Cena (edytowalna)
  - Źródło rezerwacji (formularz, Booking, telefon, etc.)

Sekcja "Dane gościa":
  - Imię i nazwisko
  - Email
  - Telefon
  - Link do profilu klienta (jeśli panel Klienci istnieje)

Sekcja "Płatności":
  - Kwota zaliczki (wpłacona / wymagana)
  - Kwota końcowa
  - Metoda płatności
  - Status płatności

Sekcja "Notatki admina":
  - Pole tekstowe na wewnętrzne notatki
  - Historia zmian statusu z datami

Sekcja "Akcje":
  - Wyślij email do gościa (z szablonu)
  - Anuluj rezerwację (z potwierdzeniem)
  - Generuj podsumowanie / fakturę
```

### 4.2 Brakujące filtry i sortowanie

**Obecny stan:** Brak jakichkolwiek filtrów i sortowania. Tabela wyświetla wszystkie rezerwacje chronologicznie.

**Proponowane zmiany:**

```
Filtry (nad tabelą):
  - Status (multi-select: Oczekująca, Zaliczka, Opłacona, Zrealizowana, Anulowana)
  - Zakres dat (date picker: od–do, dla dat zameldowania)
  - Szukaj po nazwisku/emailu (text input)
  - Liczba gości (min–max)

Sortowanie (kliknięcie na nagłówek kolumny):
  - Każda kolumna powinna być sortowalna (rosnąco/malejąco)
  - Domyślne sortowanie: Data zameldowania malejąco

Paginacja:
  - Obecnie wszystkie 30 rezerwacji na jednej stronie
  - Dodać paginację (10/25/50 per strona) dla skalowalności
```

### 4.3 Akcje masowe

```
Dodać checkboxy przy każdym wierszu + pasek akcji masowych:
  - Zmień status (dla zaznaczonych)
  - Wyślij email grupowy
  - Eksportuj do CSV/Excel
```

### 4.4 Eksport danych

```
Przycisk "Eksportuj" w prawym górnym rogu:
  - CSV
  - Excel (.xlsx)
  - PDF (raport rezerwacji)
Przydatne dla księgowości i raportowania.
```

---

## 5. Kalendarz

**Obecny stan:**
Widok miesięczny z nawigacją Poprzedni/Następny. Legenda statusów (Oczekująca, Zaliczka, Opłacona, Zablokowana). Pole „Powód blokady" + możliwość blokowania dat kliknięciem. Na kalendarzu widoczne rezerwacje jako żółte paski z etykietą (np. „asadas").

### 5.1 Czytelność rezerwacji

**Problem:** Etykiety na kalendarzu są mało czytelne — wyświetlają jakiś tekst (np. „asadas") bez kontekstu. Nie wiadomo, czyja to rezerwacja, jaki ma status.

**Proponowane zmiany:**

```
Format etykiety na kalendarzu:
  "[Imię gościa] (X nocy)" z kolorem tła odpowiadającym statusowi:
  - Żółty: Oczekująca
  - Niebieski: Zaliczka
  - Zielony: Opłacona
  - Czerwony: Zablokowana

Hover/tooltip na pasku rezerwacji:
  - Imię gościa
  - Daty: 29.03–31.03
  - Status: Oczekująca
  - Cena: 1636 zł
  - Goście: 1

Kliknięcie na pasek → otwiera szczegóły rezerwacji (ten sam drawer co w panelu Rezerwacje)
```

### 5.2 Brak widoku tygodniowego/dziennego

```
Dodać przełącznik widoków:
  - Miesiąc (obecny)
  - Tydzień (szczegółowy, z godzinami zameldowania/wymeldowania)
  - Lista (nadchodzące rezerwacje w formie listy)
```

### 5.3 Brak widoku wielu miesięcy

```
Dodać opcję "Widok kwartału" lub "3 miesiące" —
przydatne do szybkiego sprawdzenia, kiedy są wolne terminy.
```

### 5.4 Synchronizacja z zewnętrznymi kalendarzami

```
Dodać integrację iCal:
  - Export: link .ics do wklejenia w Google Calendar / Booking.com
  - Import: synchronizacja z Booking.com / Airbnb by unikać podwójnych rezerwacji
```

---

## 6. Mailing

**Obecny stan:**
Panel z szablonami emaili (Potwierdzenie gość, Powiadomienie admin, Zaliczka opłacona, Rezerwacja opłacona, Anulowanie, Po pobycie). Edytor HTML z podglądem na żywo. Zmienne dynamiczne ({{guestName}}, {{checkIn}}, etc.). Logo emailowe z możliwością zmiany.

**Ocena:** Ten panel jest dobrze zrealizowany. Kilka ulepszeń:

### 6.1 Edytor HTML → WYSIWYG

```
Problem: Edycja surowego HTML jest trudna dla nie-technicznego właściciela.
Propozycja: Dodać przełącznik "Edytor wizualny / HTML"
  - Edytor wizualny: prosty WYSIWYG (np. TipTap, Slate)
  - HTML: obecny tryb (dla zaawansowanych)
```

### 6.2 Testowy email

```
Dodać przycisk "Wyślij testowy email" obok "Zapisz":
  - Wysyła email na adres admina z przykładowymi danymi
  - Pozwala sprawdzić wygląd przed wdrożeniem
```

### 6.3 Historia wysłanych emaili

```
Dodać zakładkę "Historia" lub podstronę:
  - Lista wysłanych emaili z datą, odbiorcą, typem szablonu
  - Status dostarczenia (jeśli dostępne z providera email)
```

---

## 7. Galeria

**Obecny stan:**
Drag & drop upload + grid zdjęć z tagami sekcji (Miejsce, Koncept HOMMM). Automatyczna konwersja do WebP (pełna, 800px, miniatura 400px). Numeracja zdjęć.

**Ocena:** Dobrze zrealizowana. Ulepszenia:

### 7.1 Brak funkcji edycji/usuwania

```
Obecny stan: Nie widać opcji usunięcia ani edycji pojedynczego zdjęcia.
Propozycja: Po najechaniu na zdjęcie wyświetlić overlay z:
  - Ikona kosza (usuń z potwierdzeniem)
  - Ikona edycji (zmień tag sekcji, alt text, opis)
  - Ikona strzałek (zmień kolejność drag & drop)
  - Ikona oka (podgląd pełnowymiarowy)
```

### 7.2 Alt text dla SEO

```
Każde zdjęcie powinno mieć pole "Alt text" (PL i EN):
  - Ważne dla SEO i dostępności
  - Widoczne w edycji zdjęcia
```

### 7.3 Foldery/kategorie

```
Zamiast tylko tagów sekcji na zdjęciach, dodać filtry:
  - "Pokaż wszystkie" / "Miejsce" / "Koncept HOMMM" / "Wnętrze" / etc.
  - Pozwoli szybciej zarządzać dużą galerią
```

---

## 8. Treści (CMS)

**Obecny stan:**
Edytor sekcji strony z podglądem na żywo. Sekcje: Hero, Koncept HOMMM, Miejsce, MIEJSCA, Rezerwacja, Stopka, Menu nawigacyjne. Dwujęzyczność (PL/EN). Pola: nazwa sekcji, nagłówek, podtytuł, obraz tła, kolor tła. Widoczność sekcji (toggle). Podgląd strony po prawej.

**Ocena:** Bardzo dobrze zrealizowany panel CMS z live preview. Ulepszenia:

### 8.1 Brak edytora tekstu bogatego

```
Dla pól tekstowych (opisy sekcji) — dodać prosty rich text editor:
  - Bold, italic, linki
  - Pozwoli formatować opisy bez pisania HTML
```

### 8.2 Wersjonowanie treści

```
Dodać historię zmian:
  - "Ostatnia edycja: 2026-03-28 14:30 przez admin@..."
  - Możliwość cofnięcia do poprzedniej wersji
```

---

## 9. Struktura serwisu

**Obecny stan:**
Wizualizacja drzewa stron (Strona główna → Hero, Koncept HOMMM, Miejsce, Rezerwacja, Stopka, Menu nawigacyjne). Legenda: Strona główna, W menu, Widoczna, Ukryta. Oznaczenie: „Funkcja eksperymentalna".

**Ocena:** Wizualizacja ładna, ale ograniczona funkcjonalność.

### 9.1 Dodawanie nowych stron/sekcji

```
Czy można dodać nową sekcję? Jeśli nie — dodać przycisk "Dodaj sekcję"
z określeniem: typ, nazwa, pozycja w drzewie.
```

### 9.2 Drag & drop kolejności

```
Umożliwić zmianę kolejności sekcji przez przeciąganie węzłów.
Obecnie nie wiadomo, czy to działa (brak feedbacku wizualnego).
```

---

## 10. SEO i widoczność

**Obecny stan:**
3 zakładki: Ogólne SEO, AI/LLM, llms.txt. Pola: Tytuł (PL/EN), Opis (PL/EN), OG Image URL, Custom head tags. Przycisk „Zapisz SEO".

**Ocena:** Solidna podstawa. Ulepszenia:

### 10.1 Podgląd Google/social media

```
Dodać podgląd:
  - Google SERP preview (tytuł, opis, URL)
  - Facebook/Twitter card preview (OG image + tekst)
Pomaga sprawdzić, jak strona wygląda w wynikach wyszukiwania.
```

### 10.2 Licznik znaków

```
Przy polach Tytuł i Opis dodać licznik:
  - Tytuł: X/60 znaków (optymalnie 50-60)
  - Opis: X/160 znaków (optymalnie 150-160)
  - Kolor: zielony (ok), żółty (za krótki), czerwony (za długi)
```

### 10.3 Brak SEO per sekcja/strona

```
Obecnie jest tylko globalne SEO.
Jeśli w przyszłości dodane zostaną podstrony — każda powinna mieć własne meta tagi.
```

---

## 11. Ustawienia

**Obecny stan:**
Sekcje: Cennik i pojemność (cena za noc: 204,5 zł, max gości: 6), Dane kontaktowe (email, telefon, Instagram, Facebook, TikTok), Dane firmy (nazwa, adres, NIP), Whitelist adminów (2 adminy).

### 11.1 Cennik — brak elastyczności

```
Obecny stan: Jedna stała cena za noc (204,5 zł).
Problem: Brak cennika sezonowego, weekendowego, za dodatkowego gościa.

Proponowana zmiana — Cennik dynamiczny:
  - Cena bazowa za noc: 204,5 zł
  - Cena weekend (Pt-Nd): [pole]
  - Cena sezon wysoki (np. czerwiec-wrzesień): [pole]
  - Cena sezon niski: [pole]
  - Dopłata za dodatkowego gościa: [pole] (powyżej X osób)
  - Minimalna liczba nocy: [pole] (np. 2)
  - Minimalna liczba nocy w weekend: [pole] (np. 2-3)
  - Rabat za dłuższy pobyt (np. >7 nocy → -10%): [pole]
```

### 11.2 Brak ustawień powiadomień

```
Dodać sekcję "Powiadomienia":
  - Email przy nowej rezerwacji: ON/OFF
  - Email przy anulowaniu: ON/OFF
  - SMS powiadomienia: ON/OFF (+ numer telefonu)
  - Przypomnienie o nadchodzącym zameldowaniu (ile dni przed): [pole]
```

### 11.3 Brak ustawień płatności

```
Dodać sekcję "Płatności":
  - Wymagana zaliczka (%): [pole] np. 30%
  - Termin wpłaty zaliczki (dni od rezerwacji): [pole]
  - Numer konta bankowego (do wyświetlenia gościowi)
  - Integracja z bramką płatności (przyszłość)
```

### 11.4 Whitelist adminów — brak ról

```
Obecny stan: Tylko rola "Admin" dla obu użytkowników.
Propozycja: Dodać role:
  - Admin (pełny dostęp)
  - Manager (rezerwacje, kalendarz, mailing — bez ustawień)
  - Viewer (tylko odczyt)
```

---

## 12. NOWY PANEL: Klienci

**Obecny stan:** Panel nie istnieje.

**Uzasadnienie biznesowe:** Powtarzający się goście to najcenniejszy zasób biznesu wynajmu krótkoterminowego. Brak panelu klientów oznacza utratę wiedzy o gościach.

### 12.1 Struktura panelu Klienci

```
URL: /admin/clients
Pozycja w menu: między "Rezerwacje" a "Kalendarz"

Widok listy:
  Kolumny: Imię, Email, Telefon, Liczba rezerwacji, Łączna kwota,
           Ostatni pobyt, Ocena (wewnętrzna), Tagi

Widok szczegółów klienta:
  Sekcja "Dane kontaktowe":
    - Imię i nazwisko
    - Email
    - Telefon
    - Adres (opcjonalnie)
    - Preferowany język (PL/EN)

  Sekcja "Historia rezerwacji":
    - Lista wszystkich rezerwacji tego klienta
    - Łączna wartość rezerwacji (lifetime value)
    - Średnia długość pobytu
    - Średnia liczba gości

  Sekcja "Ocena wewnętrzna":
    - Ocena 1-5 gwiazdek (widoczna tylko dla admina)
    - Tagi: "VIP", "Powracający", "Problemowy", "Firma", "Rodzina"
    - Notatki admina (np. "zostawił bałagan", "super gość, polecił 3 osoby")

  Sekcja "Rabaty i lojalność":
    - Indywidualny rabat (%): [pole]
    - Kod rabatowy (opcjonalnie)
    - Program lojalnościowy: po X rezerwacjach → Y% rabatu

Filtry na liście:
  - Szukaj po nazwisku/emailu
  - Filtruj po tagach (VIP, Problemowy, etc.)
  - Filtruj po liczbie rezerwacji (powracający: >1)
  - Sortuj po wartości klienta (lifetime value)
```

### 12.2 Automatyczne tworzenie profili

```
Przy każdej nowej rezerwacji:
  - Sprawdź, czy klient o tym emailu już istnieje
  - Jeśli tak → przypisz rezerwację do istniejącego profilu
  - Jeśli nie → utwórz nowy profil automatycznie
```

### 12.3 Blacklista

```
Dodać możliwość oznaczenia klienta jako "Zablokowany":
  - Przy próbie rezerwacji z tego emaila → alert dla admina
  - Opcjonalny powód blokady (wewnętrzna notatka)
```

---

## 13. NOWY PANEL: Raporty finansowe

**Obecny stan:** Brak dedykowanego panelu raportów. Dashboard ma podstawowe KPI.

### 13.1 Struktura

```
URL: /admin/reports
Pozycja w menu: po "Kalendarz"

Raporty dostępne:
  1. Raport miesięczny:
     - Przychód (brutto/netto)
     - Liczba rezerwacji (nowe / anulowane / zrealizowane)
     - Obłożenie (%)
     - Średnia cena za noc
     - Porównanie z poprzednim miesiącem (% zmiana)

  2. Raport roczny:
     - Przychód miesięcznie (wykres)
     - Sezonowość (które miesiące najlepsze/najgorsze)
     - Top 5 klientów wg wartości

  3. Eksport:
     - PDF (raport do wydruku)
     - CSV (dane surowe do księgowości)
     - Zakres dat do wyboru
```

---

## 14. Nawigacja boczna (Sidebar)

**Obecny stan:**
Logo HOMMM + „Panel admina". Menu: Dashboard, Treści (▸ submenu), Galeria, Rezerwacje, Kalendarz, Mailing, Struktura, SEO, Ustawienia. Na dole: logo Conceptfab, wersja deploy, przycisk Wyloguj.

### 14.1 Kolejność menu

```
Obecna kolejność nie odpowiada częstotliwości użycia.
Właściciel najczęściej korzysta z: Rezerwacje, Kalendarz, Dashboard.

Proponowana kolejność:
  1. Dashboard
  2. Rezerwacje ← (przesunąć wyżej)
  3. Kalendarz ← (przesunąć wyżej)
  4. Klienci ← (NOWY)
  5. Raporty ← (NOWY)
  6. ---separator---
  7. Treści (▸)
  8. Galeria
  9. Mailing
  10. ---separator---
  11. Struktura
  12. SEO
  13. Ustawienia
```

### 14.2 Badge'e powiadomień

```
Dodać badge (kółko z liczbą) przy:
  - Rezerwacje: liczba oczekujących (np. "29")
  - Kalendarz: nadchodzące zameldowania w ciągu 48h
```

### 14.3 Zwijanie sidebaru

```
Dodać możliwość zwinięcia sidebaru do ikon (szczególnie na mniejszych ekranach).
Obecnie sidebar jest zawsze rozwinięty.
```

---

## 15. Ogólne problemy UI/UX

### 15.1 Brak responsywności mobilnej

```
Panel nie wygląda na zoptymalizowany pod telefon/tablet.
Dla właściciela, który zarządza domkiem „w terenie", mobilna wersja jest kluczowa.
Priorytet: widok Rezerwacji i Kalendarza na mobile.
```

### 15.2 Brak potwierdzenia akcji

```
Przy zapisywaniu zmian (Ustawienia, SEO, Treści) —
brak widocznego toastu/notyfikacji "Zapisano pomyślnie" lub "Błąd zapisu".
Dodać toast notification system (np. react-hot-toast lub sonner).
```

### 15.3 Brak trybu ciemnego/jasnego

```
Panel jest na stałe w trybie ciemnym (dark mode).
Dodać toggle dark/light — nie każdy preferuje ciemny interfejs.
```

### 15.4 Brak breadcrumbów

```
W sekcji Treści (np. Treści → Hero) jest breadcrumb "← Treści / hero".
Ale w pozostałych sekcjach nie ma breadcrumbów — dodać dla spójności.
```

### 15.5 Brak skrótów klawiszowych

```
Dla power userów — dodać skróty:
  - Ctrl+K: szybkie wyszukiwanie (rezerwacji, klientów)
  - Ctrl+N: nowa rezerwacja
  - Ctrl+S: zapisz zmiany (w edytorach)
```

### 15.6 Loading states

```
Przy ładowaniu danych — dodać skeleton loadery zamiast pustych stron.
Szczególnie ważne dla Dashboard (wiele zapytań API) i Rezerwacji.
```

---

## PRIORYTETYZACJA ZMIAN

### P0 — Krytyczne (naprawić natychmiast)
1. Naprawić obliczenia KPI (obłożenie 890%, przychód miesiąc = rok)
2. Dodać widok szczegółów rezerwacji (kliknięcie na wiersz)
3. Dodać filtry i sortowanie w panelu Rezerwacje

### P1 — Wysoki priorytet (w ciągu 2-4 tygodni)
4. Zamienić wykres "ilość rezerwacji" na "obłożenie w dniach"
5. Dodać panel Klienci (podstawowa wersja)
6. Dodać cennik dynamiczny (sezonowy/weekendowy)
7. Dodać akcje na rezerwacjach (zmiana statusu, email)

### P2 — Średni priorytet (w ciągu 1-2 miesięcy)
8. Dodać drugi wykres (peak wynajmu)
9. Dodać nowe KPI (konwersja, śr. cena, prognoza)
10. Dodać eksport danych (CSV/Excel)
11. Usprawnić kalendarz (tooltip, kolory statusów, kliknięcie → szczegóły)
12. Dodać badge powiadomień w sidebarze
13. Dodać testowy email w Mailingu
14. Dodać WYSIWYG edytor w Mailingu

### P3 — Niski priorytet (przyszłość)
15. Panel Raporty finansowe
16. Integracja iCal (Booking/Airbnb sync)
17. Role adminów
18. Responsywność mobilna
19. Alt text w galerii
20. Skróty klawiszowe
21. Historia zmian treści
22. Podgląd SEO (Google SERP preview)
