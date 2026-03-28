# Analiza PageSpeed Insights — homme-two.vercel.app

**Data raportu:** 28 marca 2026, 21:53 CET
**Narzedzie:** Lighthouse 13.0.1
**Emulacja (mobile):** Moto G Power, throttling 4G

---

## 1. Wyniki ogolne (Mobile)

| Kategoria | Wynik |
|-----------|-------|
| **Wydajnosc (Performance)** | Nisko (czerwony/pomaranczowy zakres) |
| **Ulatwienia dostepu (Accessibility)** | Brak pelnej oceny — wykryto problemy |
| **Sprawdzone metody (Best Practices)** | Wykryto problemy |
| **SEO** | **100** |

---

## 2. Core Web Vitals — Mobile

| Metryka | Wartosc | Ocena |
|---------|---------|-------|
| **FCP** (First Contentful Paint) | **2,3 s** | Pomaranczowy |
| **LCP** (Largest Contentful Paint) | **7,7 s** | Czerwony (bardzo wolno) |
| **TBT** (Total Blocking Time) | **120 ms** | Zielony |
| **CLS** (Cumulative Layout Shift) | Niski | Zielony |
| **Speed Index** | **4,9 s** | Pomaranczowy |

### Porownanie Desktop

| Metryka | Wartosc Desktop |
|---------|-----------------|
| FCP | 0,7 s |
| LCP | 1,2 s |
| TBT | 60 ms |
| CLS | Niski |
| Speed Index | 0,8 s |

> **Wniosek:** Strona dziala dobrze na desktopie, ale ma powazne problemy wydajnosciowe na mobile. LCP 7,7 s to krytyczny problem.

---

## 3. PROBLEMY KRYTYCZNE — co naprawic

### 3.1. LCP 7,7 s — glowny problem

**Element LCP:** `<section id="rezerwuj">` z obrazem tla ustawionym przez CSS (`--section-bg: url(...)`)

**Zestawienie LCP (rozklad czasu):**

| Faza | Czas |
|------|------|
| TTFB | 0 ms |
| Opoznienie ladowania zasobu | 320 ms |
| Czas ladowania zasobu | 100 ms |
| **Opoznienie renderowania** | **1970 ms** |

> **1970 ms** to czas stracony na renderowanie! Przegladarka musi najpierw zparsowac CSS, potem odkryc obraz tla, potem go pobrac.

#### Proponowane zmiany:

**Plik: komponent z sekcja `#rezerwuj` (np. `page.tsx` lub `Hero.tsx`)**

Zamiast ustawiac obraz tla przez CSS custom property:
```css
/* PRZED — obraz jest "ukryty" w CSS, przegladarka odkrywa go pozno */
.bg-slider {
  background-image: var(--section-bg);
}
```

Nalezy uzyc elementu `<img>` z `fetchpriority="high"` i `preload`:
```html
<!-- DODAC w <head> w layout.tsx -->
<link
  rel="preload"
  as="image"
  href="https://opozrvti3sfyslh8.public.blob.vercel-storage.com/[sciezka-do-obrazu].webp"
  fetchpriority="high"
/>
```

Lub uzyc `<img>` w Next.js z komponentem Image:
```tsx
// ZAMIAST background-image w CSS
import Image from 'next/image';

<section id="rezerwuj" className="section h-100vh">
  <Image
    src="https://opozrvti3sfyslh8.public.blob.vercel-storage.com/[obraz].webp"
    alt="Hero"
    fill
    priority  // <-- to dodaje fetchpriority="high" i preload
    style={{ objectFit: 'cover' }}
  />
  {/* reszta zawartosci */}
</section>
```

---

### 3.2. Render-blocking resources — oszczednosc ~670 ms

**Problem:** Dwa zasoby blokuja renderowanie:

| Zasob | Rozmiar | Czas blokowania |
|-------|---------|-----------------|
| `aff1406cf17a8cfa.css` (wlasny CSS) | 13 307 B | 170 ms |
| `use.typekit.net/zpt0osi.css` (Adobe TypeKit) | 1 145 B | 750 ms |

#### Proponowane zmiany:

**Plik: `app/layout.tsx` lub `_document.tsx`**

```tsx
// PRZED — synchroniczne ladowanie TypeKit
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />

// PO — asynchroniczne ladowanie z font-display: swap
<link
  rel="preload"
  href="https://use.typekit.net/zpt0osi.css"
  as="style"
  onLoad="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
</noscript>
```

---

### 3.3. Font Display — oszczednosc ~580 ms

**Problem:** Czcionka Adobe TypeKit nie ma ustawionego `font-display: swap`, co powoduje niewidoczny tekst podczas ladowania.

#### Proponowane zmiany:

**Plik: `next.config.js` lub `next.config.mjs`**

Rozwazyc zamiane Adobe TypeKit na Google Fonts z Next.js `next/font`:
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
// lub jesli to czcionka Adobe — uzyj next/font/local

const font = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap', // zapewnia natychmiastowe wyswietlenie tekstu
});
```

Jesli musisz zostac przy TypeKit, dodaj do CSS:
```css
/* W globalnym pliku CSS */
@font-face {
  font-display: swap; /* lub optional */
}
```

---

### 3.4. Nieuzywany JavaScript — mozliwa oszczednosc ~109 KiB

| Plik JS | Rozmiar | Nieuzywane |
|---------|---------|------------|
| `9235-dd95fcdb93bce854.js` | 112 KB | 63 KB |
| `13633bf0-5340ceabc897cd4a.js` | 28 KB | 27 KB |
| `1255-ad409e5887c155b0.js` | 46 KB | 21 KB |

#### Proponowane zmiany:

**Plik: `next.config.mjs`**

```js
// Wlacz analize bundla
// npm install @next/bundle-analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // istniejaca konfiguracja
});
```

**Plik: komponenty uzywajace ciezkich bibliotek**

```tsx
// PRZED — import na gorze
import HeavyLibrary from 'heavy-library';

// PO — dynamiczny import
import dynamic from 'next/dynamic';
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
  loading: () => <div>Ladowanie...</div>,
});
```

---

### 3.5. Legacy JavaScript — 12 KiB polyfilli

**Problem:** Plik `1255-ad409e5887c155b0.js` zawiera polyfille dla:
- `Array.prototype.at`
- `Array.prototype.flat` / `flatMap`
- `Object.fromEntries`
- `Object.hasOwn`
- `String.prototype.trimStart` / `trimEnd`

Wszystkie te metody sa wspierane przez nowoczesne przegladarki.

#### Proponowane zmiany:

**Plik: `next.config.mjs` lub `.browserslistrc`**

```js
// next.config.mjs — ustaw nowoczesny target
module.exports = {
  // ...
  experimental: {
    browsersListForSwc: true,
  },
};
```

**Plik: `.browserslistrc`**
```
last 2 versions
not dead
not ie 11
```

---

### 3.6. Lancuch zaleznosciowy (Critical Request Chain) — 905 ms

```
homme-two.vercel.app (252 ms, 8.25 KiB)
  └─ use.typekit.net/zpt0osi.css (298 ms, 1.12 KiB)
      └─ use.typekit.net/.../font (905 ms, 18.56 KiB)  <-- NAJDLUZSZA SCIEZKA
  └─ _next/static/css/aff1406cf17a8cfa.css (305 ms, 13 KiB)
```

> TypeKit tworzy lancuch 3 poziomow! HTML → CSS → Font file.

#### Proponowane zmiany:

**Plik: `app/layout.tsx`**

```html
<!-- Dodaj preconnect do zrodel czcionek -->
<link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />

<!-- DODAJ BRAKUJACY preconnect do blob storage (obrazy) -->
<link rel="preconnect" href="https://opozrvti3sfyslh8.public.blob.vercel-storage.com" />
```

---

## 4. DIAGNOSTYKA — dodatkowe problemy

### 4.1. Brak wymiarow obrazu w stopce

**Element:** `<img src="/assets/hommm.svg" alt="HOMMM" class="footer-logo">`

Brak atrybutow `width` i `height` — moze powodowac CLS.

**Plik: komponent Footer**
```tsx
// PRZED
<img src="/assets/hommm.svg" alt="HOMMM" className="footer-logo" />

// PO
<img
  src="/assets/hommm.svg"
  alt="HOMMM"
  className="footer-logo"
  width={120}   // ustaw rzeczywiste wymiary
  height={40}
/>
```

### 4.2. Dlugie zadanie w watku glownym

Plik `1255-ad409e5887c155b0.js` generuje zadanie trwajace **187 ms** (start: 3638 ms). Nalezy rozdzielic ten chunk lub zaladowac go leniwie.

### 4.3. Nieskomponowane animacje

**Element:** `img.hero-logo-main` z animacjami `hero-logo-reveal` i `hero-logo-plunk`.

**Plik: plik CSS z animacjami hero**
```css
/* PRZED — animacja uzywa wlasciwosci wymuszajacych layout */
@keyframes hero-logo-reveal {
  /* np. zmiana width, height, top, left */
}

/* PO — uzywaj TYLKO transform i opacity */
@keyframes hero-logo-reveal {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### 4.4. Brak `<main>` landmark

**Plik: `app/layout.tsx` lub glowny komponent strony**
```tsx
// PRZED
<div id="main-content">
  {children}
</div>

// PO — dodaj semantyczny <main>
<main id="main-content">
  {children}
</main>
```

### 4.5. Bledy w konsoli

Blad ladowania arkusza stylow TypeKit (`p.typekit.net/p.css`). Moze byc spowodowany bledna konfiguracja TypeKit lub problemem z CORS.

### 4.6. Brak CSP (Content Security Policy)

Brak lub slaba konfiguracja CSP — `script-src` uzywa `unsafe-inline` i dozwolonych hostow.

**Plik: `next.config.mjs` — dodaj naglowki bezpieczenstwa**
```js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline' use.typekit.net; img-src 'self' opozrvti3sfyslh8.public.blob.vercel-storage.com; font-src 'self' use.typekit.net;",
      }],
    }];
  },
};
```

---

## 5. Zasoby zewnetrzne — wplyw na wydajnosc

| Zrodlo | Rozmiar | Opis |
|--------|---------|------|
| **Adobe TypeKit** | 20 KB | Czcionki — glowne zrodlo opoznien |
| **Vercel Blob Storage** | ~607 KB | Obrazy galerii |

Obrazy z galerii sa duze:
- `e4e45726ce87c06b.webp` — **454 KB**
- `37a31fc299330a11.webp` — **153 KB**

Rozwazyc kompresje obrazow lub uzycie Next.js Image z automatyczna optymalizacja.

---

## 6. PRIORYTETY NAPRAW (od najwazniejszego)

1. **LCP** — zmienic background-image na `<Image priority>` lub dodac `<link rel="preload">` dla obrazu hero
2. **TypeKit** — zaladowac asynchronicznie lub zamienic na `next/font`
3. **Nieuzywany JS** — przeanalizowac bundle i uzyc dynamicznych importow
4. **Preconnect** — dodac dla Vercel Blob Storage
5. **Wymiary obrazow** — dodac `width`/`height` do logo w stopce
6. **Animacje** — uzyc tylko `transform`/`opacity` w keyframes
7. **Semantyka** — zmienic `<div>` na `<main>`
8. **CSP** — skonfigurowac naglowki bezpieczenstwa
