# Architektura informacji - HOMMM

## Zakres

Po realizacji Faz 0-2 publiczna czesc serwisu nadal dziala jako jedna strona (`/`), ale tresci sekcji sa juz pobierane z bazy danych z fallbackiem na dane statyczne. Model `Page` istnieje i pozwala przejsc do drzewa stron w kolejnych fazach, jednak aktualnie produkcyjnie uzywana jest tylko strona `home`.

## Struktura publiczna

### Hierarchia sekcji

| Kolejnosc | Slug | Kotwica / obszar | Rola |
|-----------|------|------------------|------|
| 1 | `hero` | `#hero-start` | Pierwsze wrazenie i branding |
| 2 | `koncept` | `#sec2-wrapper` | Opis charakteru miejsca |
| 3 | `miejsce` | `#sec3-wrapper` | Opis przestrzeni i otoczenia |
| 4 | `rezerwacja` | `#hero-start` | Panel dat, gosci i ceny w obrebie hero |
| 5 | `kontakt` | `#sec4-wrapper` | Dane kontaktowe, sociale, baner |

### Wazna decyzja IA

`hero` i `rezerwacja` to dwa osobne rekordy CMS, ale sa renderowane w tym samym obszarze wizualnym. To daje dwa efekty:

- branding i system rezerwacji pozostaja blisko siebie,
- edytor tresci musi mapowac oba slugi na ten sam obszar podgladu.

## Nawigacja publiczna

### Top menu

| Element | Zachowanie |
|---------|------------|
| `koncept` | Scroll do `#sec2-wrapper` |
| `miejsca` | Przelacza hero w widok galerii/rezerwacji i przewija do `#hero-start` |
| `rezerwuj` | Przelacza hero w widok panelu rezerwacji i przewija do `#hero-start` |
| `PL` / `EN` | Zmienia jezyk po stronie klienta przez `I18nProvider` |

### Footer

Stopka powtarza podstawowe drogi nawigacyjne:

- powrot do poczatku strony,
- przejscie do sekcji `koncept`,
- przejscie do trybu `miejsca`,
- przejscie do trybu `rezerwuj`.

### Mobile

Na szerokosci do `768px` top menu przechodzi w hamburger z overlayem. Menu:

- obsluguje `Escape`,
- ustawia `aria-expanded`,
- zamyka sie po wyborze pozycji.

## Architektura informacji w CMS

### Model danych

Tresc trzymana jest w tabeli `Section` powiazanej z `Page`.

| Pole | Znaczenie |
|------|-----------|
| `slug` | Techniczny identyfikator sekcji |
| `order` | Kolejnosc w ramach strony |
| `titlePl` / `titleEn` | Nazwa sekcji w panelu |
| `contentPl` / `contentEn` | Slownik pol tekstowych dla danej sekcji |
| `isVisible` | Flaga widocznosci w modelu |
| `bgImage` / `bgColor` | Dane prezentacyjne trzymane juz w CMS |
| `tags` | Rezerwa pod dalsze grupowanie sekcji |

### Istotne ograniczenie obecnej implementacji

CMS nie jest jeszcze w pelni schemato-niezalezny. Aktualny frontend renderuje na sztywno sekcje:

- `hero`,
- `koncept`,
- `miejsce`,
- `rezerwacja`,
- `kontakt`.

To oznacza, ze dodanie nowego rekordu `Section` w bazie nie wystarczy, zeby pojawil sie on publicznie. Trzeba jeszcze rozszerzyc `components/HomeClient.tsx`.

### Pola gotowe, ale jeszcze nieobslugiwane na froncie

| Pole | Stan |
|------|------|
| `isVisible` | Edytowalne w panelu, ale publiczny frontend nie ukrywa jeszcze sekcji na podstawie tej flagi |
| `bgImage` / `bgColor` | Edytowalne w panelu, ale warstwa publiczna nie czyta ich jeszcze przy renderowaniu |

## Architektura informacji panelu admina

### Aktualnie dostepne trasy

| URL | Rola |
|-----|------|
| `/admin/login` | Wejscie do panelu |
| `/admin/dashboard` | Karty ze statystykami |
| `/admin/content` | Lista sekcji |
| `/admin/content/[slug]` | Edytor konkretnej sekcji |

### Nawigacja shellu admina

Sidebar pokazuje tez linki do:

- `gallery`,
- `reservations`,
- `calendar`,
- `seo`,
- `settings`.

To jest nawigacja przygotowana pod kolejne fazy. Same widoki nie sa jeszcze zaimplementowane w obecnym zakresie.

## Mapa strony

### Stan aktualny

| URL | Typ | Uwagi |
|-----|-----|-------|
| `/` | publiczna | jedyna strona publiczna |
| `/admin/*` | prywatna | obszar panelu admina, poza indeksowaniem |

### Stan planowany

Dynamiczne `sitemap.xml`, `robots.txt` i ewentualne podstrony z modelu `Page` sa przewidziane na kolejne etapy. Obecna architektura danych juz to przygotowuje, ale routing publiczny nadal konczy sie na jednej stronie.

## Wnioski

Architektura informacji jest celowo prosta: jedna strona publiczna, piec sekcji i krotka droga do rezerwacji. CMS po Fazie 2 pozwala zarzadzac trescia i jezykiem, ale nie rozszerza jeszcze samej struktury informacji bez zmian w kodzie. To rozroznienie warto zachowac w dalszej dokumentacji i komunikacji z klientem.
