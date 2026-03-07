# Raport analizy kodu projektu Maja Site

## Podsumowanie

Projekt to jednostronicowa witryna Next.js (App Router) z sekcjami hero, koncept, miejsce i rezerwacja. Kod dziala poprawnie, ale zawiera kilka miejsc wymagajacych uwagi pod katem logiki, wydajnosci, nadmiarowego kodu i dobrych praktyk.

---

## 1. LOGIKA

### 1.1 Tworzenie `Set` w kazdym renderze i w kazdym uzyciu

**Plik:** `app/page.tsx:99-107`

```tsx
const onKeyDown = (event: KeyboardEvent) => {
  const dismissKeys = new Set(["ArrowDown", "ArrowUp", ...]);
  if (dismissKeys.has(event.key)) { ... }
};
```

`Set` jest tworzony od nowa przy kazdym wywolaniu `onKeyDown`. Poniewaz zbior jest staly, powinien byc zdefiniowany raz poza komponentem.

**Sugestia:**
```tsx
const DISMISS_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

// wewnatrz useEffect:
const onKeyDown = (e: KeyboardEvent) => {
  if (DISMISS_KEYS.has(e.key)) hideExpandedSection();
};
```

### 1.2 `reservationGuests` nie jest uzywany nigdzie

**Plik:** `app/page.tsx:73`

Stan `reservationGuests` jest przechowywany i renderowany w `<select>`, ale nigdy nie jest odczytywany w logice obliczen (np. cena nie zalezy od liczby gosci, nie trafia do zadnego payloadu). Jezeli jest planowany do uzycia - warto to odnotowac. Jezeli nie - mozna go usunac, aby zredukowac zbedny stan.

### 1.3 `Math.max(1, ...)` maskuje niepoprawne daty

**Plik:** `app/page.tsx:79`

```tsx
const nights = checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0;
```

Jezeli uzytkownik wybierze `checkOut` wczesniejsze niz `checkIn`, wynik `differenceInCalendarDays` bedzie ujemny, a `Math.max(1, ...)` po cichu zamieni to na 1 noc. Uzytkownik zobaczy poprawna kwote za 1 noc, chociaz daty sa niespojne. Lepiej traktowac ujemna roznice jako 0 nocy lub wyswietlic komunikat o blednych datach.

### 1.4 Przycisk REZERWUJ nie ma zadnej akcji

**Plik:** `app/page.tsx:290-292`

```tsx
<button type="button" className="reservation-summary-card__submit">REZERWUJ</button>
```

Przycisk nie posiada `onClick` ani `onSubmit`. Klikniecie nic nie robi. Nawet jako placeholder warto dodac chocby `disabled` lub wizualne oznaczenie, ze funkcja jest w budowie.

### 1.5 Linki jezykowe PL/EN nie robia nic

**Plik:** `components/TopMenu.tsx:175-180`

Linki `PL` i `EN` maja `href="#"` i nie posiadaja `onClick`. Klikniecie przewinie strone na gore (domyslne zachowanie `#`) bez zadnej zmiany jezyka.

### 1.6 `useMemo` dla `navStyle` - falsze zaleznosci

**Plik:** `components/TopMenu.tsx:131-138`

```tsx
const navStyle = useMemo(
  () => ({ "--menu-font-color": resolvedColors.font, "--menu-logo-color": resolvedColors.logo }) as CSSProperties,
  [resolvedColors],
);
```

`resolvedColors` to nowy obiekt przy kazdym renderze (wynik `forceColors ?? sectionColors`), wiec referencja zawsze sie zmienia i `useMemo` nigdy nie pomija rekalkulacji. Aby memo dzialalo, nalezy uzyc prymitywnych wartosci jako zaleznosci:

```tsx
const navStyle = useMemo(
  () => ({ "--menu-font-color": resolvedColors.font, "--menu-logo-color": resolvedColors.logo }) as CSSProperties,
  [resolvedColors.font, resolvedColors.logo],
);
```

---

## 2. WYDAJNOSC

### 2.1 Trzy oddzielne listenery `scroll` na jednej stronie

Projekt rejestruje 3 niezalezne listenery `scroll`:

1. `app/page.tsx:126-133` - `setHasScrolled`
2. `app/page.tsx:135-163` - reset `activeView` na podstawie pozycji `sec2`
3. `components/TopMenu.tsx:40-49` - `setIsCompact`

Kazdy z nich wymusza oddzielne cykle `setState` -> re-render przy kazdym zdarzeniu scroll. Mozna je skonsolidowac w jeden listener (np. custom hook `useScrollState`), ktory zwraca wszystkie potrzebne wartosci i wywoluje jeden `setState` z obiektem.

### 2.2 Brak throttle/debounce na scroll listenerach

Zdarzenie `scroll` moze odpalac sie nawet 60+ razy na sekunde. Zadna z trzech powyzszych funkcji nie jest throttlowana. Dla `setHasScrolled` i `setIsCompact` React potrafi zoptymalizowac identyczne wartosci (batching), ale listener w `page.tsx:135-163` wykonuje kosztowne operacje DOM (`getElementById`, `getBoundingClientRect`) przy kazdym uzyciu.

**Sugestia:** Uzyc `requestAnimationFrame` do throttlowania:

```tsx
let ticking = false;
const onScroll = () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      // logika...
      ticking = false;
    });
    ticking = true;
  }
};
```

### 2.3 Obrazy ladowane przez `<img>` zamiast `next/image`

**Plik:** `app/page.tsx:200, 300`

Projekt uzywa natywnych `<img>` zamiast komponentu `next/image`. Traci sie:
- automatyczna optymalizacja rozmiaru i formatu (WebP/AVIF)
- lazy loading z placeolderem
- responsywne `srcset`

Przy obrazach pelnoekranowych (hero, tla sekcji) roznica w wydajnosci ladowania moze byc znaczaca.

### 2.4 Czcionka Adobe Typekit ladowana synchronicznie w `<head>`

**Plik:** `app/layout.tsx:17`

```tsx
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
```

Synchroniczne ladowanie zewnetrznego CSS blokuje renderowanie strony. Warto uzyc `next/font` lub dodac `<link rel="preload">` z `as="style"` i callback `onload`, aby czcionka nie blokowala first paint.

### 2.5 Tla sekcji ladowane przez CSS `background-image`

**Pliki:** `globals.css:450, 587, 594, 602`

Cztery duze zdjecia sa ladowane przez `background-image`. Przegladarka:
- nie moze ich lazy-loadowac
- nie moze ich optymalizowac (format, rozmiar)
- nie moze ich priorytetyzowac (hero vs. footer)

Dla hero mozna rozwazyc `<Image priority>`, a dla pozostalych sekcji - leniwe ladowanie z Intersection Observer lub CSS `content-visibility: auto`.

---

## 3. NADMIAROWY KOD

### 3.1 Caly blok `.top-menu-row-logo` jest ukryty i nieuzywany

**Plik:** `globals.css:667-678`, `components/TopMenu.tsx:149-158`

```css
.top-menu-row-logo {
  display: none !important;
  visibility: hidden;
  height: 0;
  overflow: hidden;
}
.top-menu-row-logo .menu-home-link,
.top-menu-row-logo .menu-logo {
  display: none !important;
  opacity: 0;
  pointer-events: none;
}
```

Ten element jest renderowany w HTML, a nastepnie trojnie ukrywany w CSS (`display: none`, `visibility: hidden`, `height: 0`). Skoro nie jest widoczny, mozna go calkowicie usunac z JSX i CSS - zmniejszy to DOM i uprosci arkusz stylow.

### 3.2 Nieuzywane style `.hero-menu-sections` i `.hero-menu-card`

**Plik:** `globals.css:347-369`

Te klasy nie sa uzywane w zadnym pliku TSX. Mozna je usunac.

### 3.3 Klasa `.h-35vh` (uzywana w `not-found.tsx`) nie istnieje w CSS

**Plik:** `app/not-found.tsx:3`

```tsx
<section className="section h-35vh bg-light">
```

W `globals.css` zdefiniowane sa `.h-95vh` i `.h-40vh`, ale nie `.h-35vh`. Sekcja 404 nie dostaje zadnego stylu wysokosci, wiec moze wygladac inaczej niz zamierzono.

### 3.4 Stala `DEFAULT_LINK_TARGET` nie jest potrzebna

**Plik:** `components/TopMenu.tsx:30-34`

`DEFAULT_LINK_TARGET` jest uzywana tylko jako wartosci `href` na linkach, ale `handleMenuClick` zawsze robi `event.preventDefault()` i sam przewija do sekcji. Wartosc `href` sluzy jedynie jako fallback dla noscript/SEO, ale w przypadku SPA jest redundantna. Mozna uproscic, ale nie jest to krytyczne.

### 3.5 Alias `@/*` w `tsconfig.json` wskazuje na nieistniejacy katalog

**Plik:** `tsconfig.json:17`

```json
"paths": { "@/*": ["./src/*"] }
```

Projekt nie ma katalogu `src/` - pliki sa w `app/` i `components/`. Ten alias jest nieuzywany i moze wprowadzac w blad.

---

## 4. POPRAWNOSC CSS

### 4.1 Dziura w ramce rezerwacji (zgloszone w TODO)

**Plik:** `globals.css:165-208`

Bloki `.reservation-summary-card__dates` i `.reservation-summary-card__guests` tworza wizualnie jedna ramke, ale sa oddzielnymi elementami z wlasnymi `border`. Styk tych dwoch elementow (usuniety `border-top: 0` na `.guests`) moze powodowac wizualna "dziure" lub podwojona linie na niektorych ekranach (subpixelowy rendering).

**Sugestia:** Owinac oba elementy jednym wrapperem z wspolnym `border` i `border-radius`, zamiast laczyc dwa niezalezne bloki krawedziami.

### 4.2 Niespojne naglowki (zgloszone w TODO)

W roznych sekcjach naglowki maja rozne style:
- `.h1-brand` - customowa czcionka `blackcurrant`, specyficzny rozmiar
- `.story-subtitle` (h2) - `font-weight: 900`, uppercase
- `.expanded-content-copy-col h2` - inny clamp, brak font-weight
- media query `h2` (`globals.css:906-908`) - globalnie ustawia `1.5rem` dla wszystkich h2

Wedlug TODO, wszystkie naglowki poza `.h1-brand` powinny miec ten sam styl. Obecnie kazdy h2 ma inny zestaw wlasciwosci.

**Sugestia:** Zdefiniowac jedna klase bazowa (np. `.heading-secondary`) z wspolnym stylem i stosowac ja wszedzie poza `.h1-brand`.

### 4.3 `font-family: sans-serif` na body, ale czcionka Typekit w head

**Plik:** `globals.css:22`, `app/layout.tsx:17`

Body ma `font-family: sans-serif`, wiec czcionka z Typekit nie jest nigdzie uzywana jako domyslna. Jedynie `.h1-brand` uzywa `blackcurrant`. Jezeli Typekit dostarcza wiecej krojow, warto je ustawic na body. Jezeli tylko `blackcurrant` - mozna rozwazyc ladowanie jej lokalnie zamiast przez zewnetrzny serwis.

---

## 5. ARCHITEKTURA I DOBRE PRAKTYKI

### 5.1 Cala logika strony w jednym komponencie

**Plik:** `app/page.tsx` (377 linii)

Komponent `Home` zawiera:
- logike rezerwacji (stan, obliczenia, formularz)
- logike rozwijanych sekcji
- logike scrollowania i menu
- caly rendering 4 sekcji

Warto wydzielic przynajmniej:
- `ReservationSystem` - kalendarz + podsumowanie
- `ExpandableSection` - sekcja z rozwinieciem
- `useScrollState` - custom hook na scroll logike

### 5.2 Dane statyczne inline zamiast osobnego pliku

**Plik:** `app/page.tsx:26-63`

`EXPANDED_SECTION_CONTENT` to duzy obiekt z tresciami. Przy rozbudowie strony o wiecej sekcji, warto przeniesc go do osobnego pliku (np. `data/content.ts`).

### 5.3 Brak `minDate` na DatePicker

**Plik:** `app/page.tsx:241-252`

DatePicker pozwala wybrac daty z przeszlosci. Warto dodac `minDate={new Date()}` aby zablokowac rezerwacje na minionye terminy.

### 5.4 Hardkodowana data poczatkowa rezerwacji

**Plik:** `app/page.tsx:70-71`

```tsx
new Date(2026, 0, 30), new Date(2026, 1, 1)
```

Data jest zahardkodowana na styczeN 2026. Po tej dacie domyslna rezerwacja bedzie w przeszlosci. Lepiej ustawic domyslne daty relatywnie (np. jutro + pojutrze) lub zaczac od `[null, null]`.

### 5.5 Brak meta viewport w layout

**Plik:** `app/layout.tsx`

Next.js 15 dodaje viewport meta automatycznie, wiec nie jest to blad - ale warto byc swiadomym, ze konfiguracja viewport (np. `width=device-width, initial-scale=1`) jest domyslna i moze byc nadpisana przez `export const viewport` w layout.

---

## 6. PODSUMOWANIE PRIORYTETOW

| Priorytet | Problem | Typ |
|-----------|---------|-----|
| Wysoki | Hardkodowana data rezerwacji (bedzie nieaktualna) | Logika |
| Wysoki | Brak `minDate` na DatePicker (mozna rezerwowac przeszlosc) | Logika |
| Wysoki | Brak klasy `.h-35vh` w CSS (strona 404 bez wysokosci) | CSS |
| Sredni | `useMemo` z referencja obiektowa - nie dziala | Wydajnosc |
| Sredni | Trzy niezalezne scroll listenery | Wydajnosc |
| Sredni | Obrazy przez `<img>` zamiast `next/image` | Wydajnosc |
| Sredni | Synchroniczne ladowanie czcionki Typekit | Wydajnosc |
| Sredni | Ukryty blok `.top-menu-row-logo` - martwy kod w DOM i CSS | Czystosc |
| Sredni | Nieuzywane klasy CSS (`.hero-menu-sections`, `.hero-menu-card`) | Czystosc |
| Niski | `reservationGuests` nieuzywany w logice | Czystosc |
| Niski | Alias `@/*` do nieistniejacego `src/` | Konfiguracja |
| Niski | Brak akcji na przycisku REZERWUJ i linkach PL/EN | UX |
