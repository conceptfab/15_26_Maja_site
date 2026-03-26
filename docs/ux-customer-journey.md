# UX, Customer Journey i Dostepnosc - HOMMM

## Zakres

Ten dokument opisuje stan projektu po realizacji Faz 0, 1 i 2. Obejmuje:

- publiczny flow goscia na aktualnej stronie one-page,
- flow admina w panelu logowania i edycji tresci,
- najwazniejsze punkty tarcia, ktore zostaly rozwiazane lub nadal czekaja na kolejne fazy,
- biezacy stan dostepnosci.

## Persony

### Gosc szukajacy noclegu

| Obszar | Opis |
|--------|------|
| Cel | Szybko ocenic klimat miejsca, sprawdzic termin i wyslac zapytanie o pobyt |
| Kontekst | Mobile-first, wejscie z polecenia, social media albo wyszukiwarki |
| Oczekiwania | Ladne zdjecia, prosty wybor terminu, czytelna cena, szybki kontakt |
| Ryzyko | Odpada z flow, gdy rezerwacja wymaga lokalnego klienta poczty |

### Admin obiektu

| Obszar | Opis |
|--------|------|
| Cel | Samodzielnie zmieniac tresci PL/EN bez ingerencji developera |
| Kontekst | Laptop lub tablet, niska tolerancja na zlozony interfejs |
| Oczekiwania | Proste logowanie, jasny panel, podglad zmian przed zapisem |
| Ryzyko | Potrzeba edycji wykraczajacej poza zdefiniowane sekcje wymaga zmian w kodzie |

## Customer Journey - gosc

### 1. Odkrycie

| Element | Stan aktualny |
|---------|---------------|
| Punkt wejscia | Hero na stronie glownej `/` |
| Co dziala | Mocny branding, duzy sygnet, prosty punkt startu |
| Co wspiera decyzje | Top menu prowadzi od razu do konceptu, miejsc lub rezerwacji |
| Co jeszcze czeka | Brak warstwy SEO/OG i analityki z dalszych faz |

### 2. Eksploracja miejsca

| Element | Stan aktualny |
|---------|---------------|
| Sekcje | `koncept` i `miejsce` z rozwinieciem "Czytaj wiecej" |
| Co dziala | Tresci sa juz dwujezyczne i pobierane z DB z fallbackiem na dane statyczne |
| Co wspiera decyzje | Galeria i rozwiniety opis bez zmiany strony |
| Co jeszcze czeka | Sekcje sa nadal na stale zaszyte w frontendzie, bez w pelni dynamicznego renderingu nowych blokow |

### 3. Decyzja o rezerwacji

| Element | Stan aktualny |
|---------|---------------|
| Sekcja | `rezerwacja` w obrebie hero |
| Co dziala | Wybor zakresu dat, liczby gosci, przeliczanie ceny i odmian jezykowych |
| Co wspiera decyzje | Jeden ekran laczy galerie, opis i panel rezerwacji |
| Co jeszcze czeka | Brak blokady zajetych terminow i brak backendowego flow rezerwacji |

### 4. Wyslanie zapytania

| Element | Stan aktualny |
|---------|---------------|
| Mechanizm | `mailto:` generowane po kliknieciu przycisku rezerwacji |
| Ryzyko | Krytyczny punkt tarcia - zaleznosc od skonfigurowanego klienta pocztowego |
| Planowana zmiana | Publiczne API rezerwacji + potwierdzenia email w Fazie 3 |

## Customer Journey - admin

### 1. Logowanie

| Element | Stan aktualny |
|---------|---------------|
| Wejscie | `/admin/login` |
| Co dziala | Email z whitelisty + wspolny secret code + cookie sesyjne httpOnly |
| Ochrona | Middleware broni `/admin/*`, a akcje serwerowe potwierdzaja sesje w DB |

### 2. Wejscie do panelu

| Element | Stan aktualny |
|---------|---------------|
| Dashboard | Proste karty statystyk z liczba rezerwacji, sekcji i obrazow |
| Nawigacja | Desktop sidebar i mobile sheet |
| Ograniczenie | Czesc linkow w shellu prowadzi do funkcji zaplanowanych na dalsze fazy |

### 3. Edycja tresci

| Element | Stan aktualny |
|---------|---------------|
| Lista sekcji | `/admin/content` pokazuje wszystkie sekcje strony glownej |
| Edycja | `/admin/content/[slug]` ma osobne zakladki PL/EN |
| Mocna strona | Live preview przez `iframe` i `postMessage` skraca petle edycji |
| Ograniczenie | Admin edytuje tylko zdefiniowane pola dla istniejacych sekcji |

## Punkty tarcia

### Rozwiazane w Fazach 1-2

| Problem | Status |
|---------|--------|
| Brak aktywnego przelacznika PL/EN | Rozwiazane - i18n dziala po stronie klienta |
| Brak panelu do edycji tresci | Rozwiazane - admin moze edytowac tresci sekcji w PL i EN |
| Brak dostepu do podgladu zmian podczas edycji | Rozwiazane - edytor ma live preview |
| Brak skip linka | Rozwiazane - dodany link "Przejdz do tresci" |

### Nadal otwarte

| Problem | Wplyw | Plan |
|---------|-------|------|
| Rezerwacja przez `mailto:` | Blokuje czesc konwersji | Faza 3 |
| Brak statusow i dostepnosci terminow | Gosc nie wie, czy termin jest wolny | Faza 3 |
| Brak SEO i danych strukturalnych | Slabsza widocznosc i preview | Faza 5 |
| Brak pelnej dynamiki sekcji | Dodanie nowej sekcji wymaga zmian w `HomeClient.tsx` | Kolejny etap CMS |

## Dostepnosc - stan biezacy

### Zaadresowane

| Obszar | Stan |
|--------|------|
| Skip link | Obecny w `app/layout.tsx` |
| `nav` i aria-label w menu | Obecne |
| Mobile menu | Obsluguje `Escape`, `aria-expanded` i `aria-controls` |
| Preferencja reduced motion | Czesc animacji jest wylaczana przez `prefers-reduced-motion` |
| Jezyk interfejsu | `setLocale()` aktualizuje `document.documentElement.lang` po zmianie jezyka |

### Nadal do poprawy

| Obszar | Komentarz |
|--------|-----------|
| Landmarki | Glowna tresc nie jest jeszcze opakowana w semantyczne `<main>`, a stopka nadal jest renderowana jako `<section>` |
| Focus states | Brak pelnego, systemowego `focus-visible` na calej publicznej warstwie |
| SSR jezyka | Root layout startuje z `lang=\"pl\"`; zapisany jezyk z `localStorage` jest przywracany dopiero po stronie klienta |
| Formularz rezerwacji | Nadal bez komunikatow serwerowych, walidacji i `aria-live` dla wysylki |

## Wnioski

Po Fazach 0-2 projekt ma juz sensowny fundament UX: jasny flow strony glownej, aktywne PL/EN, panel admina i edycje tresci z podgladem. Najwiekszy problem konwersyjny pozostaje niezmienny: etap rezerwacji nadal konczy sie na `mailto:` i powinien byc pierwszym kandydatem do dalszej implementacji.
