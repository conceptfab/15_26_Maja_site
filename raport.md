# Raport analizy kodu projektu HOMMM

## Podsumowanie

Projekt to jednosekcyjna strona Next.js (App Router) dla marki apartamentowej HOMMM. Składa się z 4 plików źródłowych (`page.tsx`, `layout.tsx`, `not-found.tsx`, `TopMenu.tsx`) + 1 plik danych (`content.ts`) + 1 plik CSS (`globals.css`). Kod działa poprawnie, ale zawiera szereg miejsc wymagających uwagi pod kątem logiki, wydajności, utrzymywalności i nadmiarowego kodu.

---

## 1. POPRAWNOŚĆ LOGIKI

### 1.1 Przycisk REZERWUJ nie robi nic
**Plik:** `app/page.tsx:383-388`
**Problem:** Przycisk `<button>REZERWUJ</button>` w karcie podsumowania rezerwacji nie ma żadnego `onClick` handlera. Użytkownik może wybrać daty, liczbę gości, ale kliknięcie "REZERWUJ" nie wywołuje żadnej akcji.
**Sugestia:** Dodać handler, który np. przekieruje do zewnętrznego systemu rezerwacji, wyśle formularz, lub przynajmniej wyświetli komunikat potwierdzający.

### 1.2 Stan `reservationGuests` jest nieużywany
**Plik:** `app/page.tsx:48`
**Problem:** Zmienna `reservationGuests` jest zapisywana przez `<select>`, ale nigdy nie jest odczytywana poza komponentem select (nie jest przekazywana do żadnego API, nie wpływa na cenę, nie jest częścią żadnego submita).
**Sugestia:** Jeśli liczba gości ma wpływać na cenę lub być przesyłana — podłączyć do logiki rezerwacji. Jeśli nie — rozważyć usunięcie lub oznaczenie jako TODO.

### 1.3 Tworzenie `new Date()` przy każdym renderze
**Plik:** `app/page.tsx:64`
**Problem:** `const today = new Date()` jest wywoływane przy każdym renderze komponentu. Obiekt jest przekazywany jako `minDate` do DatePicker, co potencjalnie powoduje niepotrzebne re-rendery (nowa referencja obiektu).
**Sugestia:** Przenieść do `useMemo` lub `useRef`:
```tsx
const today = useMemo(() => new Date(), []);
```

### 1.4 Linki social media prowadzą donikąd
**Plik:** `app/page.tsx:578, 597, 619`
**Problem:** Linki Instagram, TikTok, Facebook mają `href="#"`, co przy kliknięciu przewinie stronę na górę.
**Sugestia:** Wstawić rzeczywiste URL-e lub dodać `event.preventDefault()`.

### 1.5 Nawigacja footer "KONCEPT" i "MIEJSCA" — zwykłe linki zamiast smooth scroll
**Plik:** `app/page.tsx:514-519`
**Problem:** Linki w stopce (`<a href="#sec2-wrapper">`) używają domyślnej nawigacji HTML zamiast smooth scroll z obsługą stanu (w przeciwieństwie do menu, które używa `handleMenuClick`). To powoduje niespójne zachowanie — kliknięcie w menu robi smooth scroll + reset stanu, a kliknięcie w footer nie.
**Sugestia:** Dodać `onClick` handler analogiczny do menu.

### 1.6 Języki PL/EN nie działają
**Plik:** `components/TopMenu.tsx:163-165, 216-221`
**Problem:** Kliknięcie PL/EN wywołuje jedynie `event.preventDefault()` — nie ma żadnej logiki zmiany języka. Jednocześnie "PL" jest zawsze oznaczone jako `is-active`.
**Sugestia:** Jeśli wielojęzyczność nie jest planowana — usunąć sekcję języków. Jeśli jest — wdrożyć i18n (np. `next-intl`).

---

## 2. WYDAJNOŚĆ

### 2.1 `window.matchMedia()` wywoływane wewnątrz `requestAnimationFrame`
**Plik:** `app/page.tsx:114`
**Problem:** `window.matchMedia('(max-width: 768px)').matches` jest wywoływane przy każdym zdarzeniu scroll (wewnątrz rAF). `matchMedia` jest relatywnie tanie, ale tworzenie nowego obiektu MediaQueryList przy każdym scrollu to zbędna praca.
**Sugestia:** Wynieść `matchMedia` do `useRef` lub `useState` z listenerem `change`, analogicznie jak jest to zrobione w `TopMenu.tsx:100-111`.

### 2.2 Wielokrotne `document.getElementById` w scroll handlerze
**Plik:** `app/page.tsx:117, 135, 149-150`
**Problem:** Przy każdym zdarzeniu scroll wykonywane są zapytania `getElementById` — DOM lookup w hot path.
**Sugestia:** Zapamiętać referencje do elementów w `useRef` (raz, po zamontowaniu) zamiast szukać ich przy każdym scrollu.

### 2.3 Dwa osobne scroll listenery
**Plik:** `app/page.tsx:69-99` (effect 1 — dismiss expanded) i `app/page.tsx:101-170` (effect 2 — scroll tracking)
**Problem:** Istnieją dwa niezależne `useEffect` z listenerami `scroll`/`wheel`. Oba reagują na podobne zdarzenia i oba mogą zamykać `expandedSection`.
**Sugestia:** Rozważyć połączenie logiki dismiss z głównym scroll handlerem, eliminując duplikację listenerów.

### 2.4 Hero background — `background-image` zamiast `<Image>`
**Plik:** `globals.css:532-538`
**Problem:** Sekcja hero, `.bg-secondary`, `.bg-dark`, `.bg-light` używają CSS `background-image` z bezpośrednimi URL-ami do plików JPG. Pomija to Next.js `<Image>` z jego optymalizacjami (WebP/AVIF, lazy loading, responsive sizes, blur placeholder).
**Sugestia:** Zastąpić background-image komponentem `<Image>` z `fill` + `priority` (dla hero) / bez priority (dla pozostałych). Alternatywnie skonfigurować `next.config.ts` z `images.formats`.

### 2.5 SVG logo w hero — `<img>` zamiast `<Image>`
**Plik:** `app/page.tsx:401`
**Problem:** Logo w hero używa `<img src="/assets/hommm.svg">` zamiast komponentu `next/image`. Choć dla SVG różnica jest mniejsza, to narusza spójność (w innych miejscach używany jest `<Image>`).
**Sugestia:** Ujednolicić — użyć `<Image>` lub zaimportować SVG jako komponent React.

### 2.6 Brak `priority` na hero image
**Plik:** `app/page.tsx:276-281`
**Problem:** Obrazy w sekcji rezerwacji (widoczne od razu) nie mają `priority={true}`, co opóźnia ich ładowanie (lazy loading domyślnie).
**Sugestia:** Dla obrazów above-the-fold dodać `priority`.

---

## 3. NADMIAROWY KOD

### 3.1 Zduplikowana deklaracja `.reservation-system__clear`
**Plik:** `globals.css:134-150` i `globals.css:353-365`
**Problem:** Klasa `.reservation-system__clear` jest zdefiniowana dwukrotnie z częściowo sprzecznymi właściwościami:
- Linia 134: `display: flex; padding: 12px;`
- Linia 353: `display: inline-block; margin-top: 10px; margin-left: auto;`
Druga deklaracja nadpisuje pierwszą (cascade), co może prowadzić do nieoczekiwanego zachowania.
**Sugestia:** Usunąć jedną z deklaracji i zostawić jedną spójną definicję.

### 3.2 Klasa `.h-95vh` nie jest nigdzie używana
**Plik:** `globals.css:517-520`
**Problem:** Klasa `.h-95vh` jest zdefiniowana (identycznie jak `.h-100vh`), ale nigdzie w kodzie nie jest stosowana.
**Sugestia:** Usunąć.

### 3.3 Atrybut `data-menu-font` / `data-menu-logo` — złożoność vs użycie
**Plik:** `app/page.tsx:256-257, 410-411, 446-447, 485-486` + `TopMenu.tsx:52-97`
**Problem:** Kolory menu są ustalane przez data-atrybuty na sekcjach + IntersectionObserver, ALE jednocześnie `page.tsx` przekazuje `forceColors` do `TopMenu` w trybach rezerwacji/expanded. Te dwa mechanizmy nakładają się na siebie — `forceColors` zawsze wygrywa, gdy jest ustawiony.
**Sugestia:** Uprościć — jeśli `forceColors` pokrywa wszystkie "nietypowe" przypadki, data-atrybuty mogą być zbędne (lub odwrotnie — usunąć forceColors i polegać na data-atrybutach).

### 3.4 Puste kolumny w footer grid
**Plik:** `app/page.tsx:498-500, 534-536`
**Problem:** Dwie kolumny (`footer-column--spacer`) istnieją wyłącznie jako puste spacery w gridzie. Na mobile są ukrywane (`display: none`).
**Sugestia:** Zamiast pustych divów, użyć `grid-template-columns` z odpowiednimi proporcjami i `gap`, co da ten sam efekt wizualny bez zbędnego HTML.

---

## 4. ARCHITEKTURA I UTRZYMYWALNOŚĆ

### 4.1 Komponent `page.tsx` jest zbyt duży (~650 linii)
**Problem:** Cały widok strony — hero, rezerwacja, sekcje story, expanded content, footer — żyje w jednym pliku z wieloma stanami, efektami i inline JSX (w tym dużo inline SVG).
**Sugestia:** Wydzielić osobne komponenty:
- `ReservationSection` — formularz rezerwacji z DatePickerem
- `StorySection` — sekcja z opisem i "czytaj więcej"
- `ExpandedContent` — rozwinięta treść
- `Footer` — stopka z kontaktem i social media
- Wydzielić ikony SVG do osobnych komponentów lub plików

### 4.2 Inline SVG ikony
**Plik:** `app/page.tsx:327-340, 544-556, 570, 582-594, 603-613, 625-631`
**Problem:** 6 różnych ikon SVG jest wstawionych bezpośrednio inline w JSX. To zaśmieca markup, utrudnia ponowne użycie i zwiększa rozmiar komponentu.
**Sugestia:** Wydzielić do osobnego pliku `components/Icons.tsx` lub użyć biblioteki ikon (np. `lucide-react` — eraser, mail, phone, instagram, tiktok, facebook).

### 4.3 Hardkodowane kolory i magic numbers
**Problem:** Kolor `#be1622` pojawia się w wielu miejscach zarówno w CSS jak i w JSX/TS. Wartości jak `0.55`, `10`, `24`, `0.35` (progi scrollowania) są rozproszone bez nazw.
**Sugestia:**
- CSS: zdefiniować `--color-brand: #be1622` w `:root` i używać zmiennej
- JS: wydzielić stałe `SCROLL_THRESHOLD`, `SECTION_RESET_POINT` itp.

### 4.4 Brak konfiguracji ESLint
**Problem:** W `package.json` jest script `lint: "next lint"`, ale brak pliku `.eslintrc` / `eslint.config.js`.
**Sugestia:** Dodać konfigurację ESLint (np. `next/core-web-vitals`).

---

## 5. DOSTĘPNOŚĆ (a11y)

### 5.1 Wiele `<h1>` na stronie
**Plik:** `app/page.tsx:417, 453`
**Problem:** Strona ma dwa elementy `<h1>` ("YOUR SPECIAL TIME" i "YOUR SPECIAL PLACE") plus headingi wewnątrz expanded content. Wiele `<h1>` może zdezorientować czytniki ekranu.
**Sugestia:** Zmienić na `<h2>` lub ujednolicić hierarchię nagłówków.

### 5.2 `role="menubar"` bez pełnej implementacji ARIA
**Plik:** `components/TopMenu.tsx:202`
**Problem:** Div z `role="menubar"` nie implementuje wymaganego patternu ARIA (brak `role="menuitem"` na linkach, brak nawigacji klawiaturowej strzałkami).
**Sugestia:** Usunąć `role="menubar"` (linki nawigacyjne nie potrzebują tego patternu) lub wdrożyć pełny wzorzec ARIA menubar.

### 5.3 Brak focus management po otwarciu expanded content
**Problem:** Po kliknięciu "CZYTAJ WIĘCEJ" content się rozwija, ale focus nie jest przenoszony na nowy content. Użytkownik klawiatury/czytnika ekranu nie wie, że coś się zmieniło.
**Sugestia:** Po rozwinięciu ustawić focus na heading rozwinięte treści.

---

## 6. OPTYMALIZACJE CSS

### 6.1 `scroll-behavior: smooth` w CSS + `scrollIntoView({ behavior: 'smooth' })` w JS
**Plik:** `globals.css:16` + `app/page.tsx:181, 189` + `TopMenu.tsx:135`
**Problem:** Smooth scroll jest ustawiony podwójnie — w CSS globalnie i w każdym wywołaniu JS. CSS `scroll-behavior: smooth` wpływa na WSZYSTKIE scrolle (w tym programmatyczne), co może kolidować z JS smooth scrolling.
**Sugestia:** Wybrać jedno podejście. Dla pełnej kontroli lepszy jest JS (`scrollIntoView`), wtedy usunąć `scroll-behavior: smooth` z CSS.

### 6.2 Fonty — `body { font-family: sans-serif }` + Adobe Typekit
**Plik:** `globals.css:21`, `app/layout.tsx:18-22`
**Problem:** Body ma `font-family: sans-serif`, a font `blackcurrant` z Typekit jest używany tylko w `.h1-brand`. Cały Typekit CSS jest ładowany dla jednego fontu w jednej klasie.
**Sugestia:** Sprawdzić, czy Typekit CSS nie jest zbyt ciężki. Rozważyć `font-display: swap` (jeśli nie jest ustawione w Typekit). Alternatywnie — self-host fontu.

---

## 7. PODSUMOWANIE PRIORYTETÓW

| Priorytet | Problem | Wpływ |
|-----------|---------|-------|
| WYSOKI | Przycisk REZERWUJ nie działa (1.1) | UX — użytkownik nie może dokonać rezerwacji |
| WYSOKI | Zduplikowany CSS `.reservation-system__clear` (3.1) | Potencjalne bugi wizualne |
| ŚREDNI | `matchMedia` w scroll handlerze (2.1) | Wydajność na słabszych urządzeniach |
| ŚREDNI | Brak `<Image>` dla tła sekcji (2.4) | Wydajność ładowania strony |
| ŚREDNI | Komponent page.tsx zbyt duży (4.1) | Utrzymywalność kodu |
| NISKI | Nieużywana klasa `.h-95vh` (3.2) | Czystość kodu |
| NISKI | Inline SVG (4.2) | Czytelność i reużywalność |
| NISKI | Hardkodowane kolory (4.3) | Spójność i utrzymywalność |
