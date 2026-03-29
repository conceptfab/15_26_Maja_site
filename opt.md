# Optymalizacja wydajnosci — homme-two.vercel.app

> Raport z 29.03.2026, PageSpeed Insights (Lighthouse 13.0.1)
> Linki do raportow:
> - [Mobile](https://pagespeed.web.dev/analysis/https-homme-two-vercel-app/u2bw0948eq?form_factor=mobile)
> - [Desktop](https://pagespeed.web.dev/analysis/https-homme-two-vercel-app/u2bw0948eq?form_factor=desktop)

---

## 1. Podsumowanie wynikow

### Mobile (emulacja Moto G Power, 4G throttling)

| Kategoria | Wynik |
|---|---|
| Wydajnosc | **74** / 100 |
| Ulatwienia dostepu | **100** / 100 |
| Sprawdzone metody | **85** / 100 |
| SEO | **100** / 100 |

| Metryka | Wartosc | Status |
|---|---|---|
| First Contentful Paint (FCP) | **2,3 s** | Sredni |
| Largest Contentful Paint (LCP) | **6,0 s** | Zly |
| Total Blocking Time (TBT) | **0 ms** | Dobry |
| Cumulative Layout Shift (CLS) | **0** | Dobry |
| Speed Index | **3,8 s** | Sredni |

### Desktop (bez throttlingu)

| Kategoria | Wynik |
|---|---|
| Wydajnosc | **~96** / 100 |
| Ulatwienia dostepu | **100** / 100 |
| Sprawdzone metody | **~85** / 100 |
| SEO | **100** / 100 |

| Metryka | Wartosc | Status |
|---|---|---|
| First Contentful Paint (FCP) | **0,4 s** | Dobry |
| Largest Contentful Paint (LCP) | **1,5 s** | Sredni |
| Total Blocking Time (TBT) | **10 ms** | Dobry |
| Cumulative Layout Shift (CLS) | **0** | Dobry |
| Speed Index | **0,5 s** | Dobry |

---

## 2. Glowne problemy i jak je naprawic

### PRIORYTET 1: LCP — Obraz hero (najwiekszy wplyw na wynik)

**Problem:** LCP = 6,0 s (mobile). Element LCP to obraz w sekcji `#rezerwuj` (`img.pointer-events-none`). Zestawienie LCP:
- TTFB: 0 ms
- Opoznienie ladowania zasobu: 190 ms
- Czas wczytywania zasobu: 40 ms
- **Opoznienie renderowania: 1080 ms** (tu jest problem)

**Rozwiazanie:**

#### a) Dodaj `fetchpriority="high"` do obrazu LCP

```tsx
// W komponencie sekcji #rezerwuj, na obrazie hero:
<Image
  src={heroImageUrl}
  alt=""
  fill
  priority          // juz jest (brak lazy loading — dobrze)
  fetchPriority="high"  // DODAJ — sygnalizuje przegladarce priorytet
  // ...
/>
```

#### b) Dodaj `sizes` odpowiednie do viewportu

Obraz serwowany jako 800px (mobile) i 1920px (desktop) — zbyt duzy rozmiar. Uzyj `sizes`:

```tsx
<Image
  src={heroImageUrl}
  alt=""
  fill
  priority
  fetchPriority="high"
  sizes="100vw"  // lub bardziej precyzyjne, np. "(max-width: 768px) 100vw, 1335px"
  quality={80}   // rozważ zmniejszenie z 75 na nizsza wartosc lub zostawienie
/>
```

#### c) Rozważ preload obrazu LCP w `<head>`

W `layout.tsx` lub `page.tsx` (head):

```tsx
// next/head lub metadata API
<link
  rel="preload"
  as="image"
  href="https://opozrvti3sfyslh8.public.blob.vercel-storage.com/gallery/e4e45726ce87c06b.webp"
  fetchpriority="high"
/>
```

---

### PRIORYTET 2: Optymalizacja obrazow (Mobile: ~63 KiB, Desktop: ~271 KiB do zaoszczedzenia)

**Problem:** Obrazy sa za duze wzgledem wyswietlanych wymiarow:
- Sekcja `#rezerwuj`: serwowany 800x762, wyswietlany 412x821 (mobile) / 1920x1830 vs 1335x938 (desktop)
- Sekcja `#miejsca`: serwowany 800x580, wyswietlany 412x821 (mobile)
- Sekcja `#koncept`: serwowany 800x567, wyswietlany 412x821 (mobile)

**Rozwiazanie:**

#### a) Popraw `sizes` na wszystkich obrazach sekcyjnych

```tsx
// Zamiast domyslnego (brak sizes = pelna szerokosc)
<Image
  src={imageUrl}
  alt=""
  fill
  sizes="(max-width: 768px) 100vw, 1335px"
  // ...
/>
```

#### b) Rozważ zmniejszenie quality

```tsx
// next/image domyslnie uzywa q=75, mozna probowac q=65-70 dla tla
quality={70}
```

#### c) Upewnij sie, ze zrodlowe obrazy w Vercel Blob maja odpowiedni rozmiar

Jesli zrodlowe obrazy sa np. 3000x2000px, a wyswietlasz max 1920px — przeskaluj je przed uploadem do max 2048px szerokosci.

---

### PRIORYTET 3: Niepoprawny wspolczynnik proporcji obrazow (Best Practices -15 pkt)

**Problem:** Wspolczynniki proporcji wyswietlanych obrazow nie zgadzaja sie z rzeczywistymi:
- `#rezerwuj`: wyswietlany 412x821 (0.50), rzeczywisty 800x762 (1.05)
- `#koncept`: wyswietlany 412x821 (0.50), rzeczywisty 800x567 (1.41)
- `#miejsca`: wyswietlany 412x821 (0.50), rzeczywisty 800x580 (1.38)
- `#kontakt`: wyswietlany 412x547 (0.75), rzeczywisty 800x187 (4.28)

**Rozwiazanie:**

Uzywasz `object-cover` z `fill` — to prawidlowe podejscie dla tla. Ale Lighthouse raportuje niezgodnosc proporcji. Opcje:
1. **Przygotuj obrazy o proporcjach zblizonych do kontenera** (np. 9:16 dla mobile hero) — najlepsze rozwiazanie
2. Lub zaakceptuj ten audit — `object-cover` celowo przycina obraz, wiec niezgodnosc jest zamierzona

---

### PRIORYTET 4: Nieuzywany JavaScript (~68 KiB do zaoszczedzenia)

**Problem:** Dwa chunki JS maja duzo nieuzywnaego kodu:
- `7900-950eedbd3bb9864b.js`: 143 KB przeslane, ~70 KB nieuzywane
- `1255-ad409e5887c155b0.js`: 97 KB przeslane, ~49 KB nieuzywane

**Rozwiazanie:**

#### a) Sprawdz import dynamiczny

```tsx
// Zamiast statycznego importu ciezkich bibliotek:
import { HeavyComponent } from 'heavy-lib';

// Uzyj dynamic import:
import dynamic from 'next/dynamic';
const HeavyComponent = dynamic(() => import('heavy-lib'), {
  loading: () => <div>...</div>,
});
```

#### b) Przeanalizuj bundle

```bash
# Dodaj do package.json:
npm install --save-dev @next/bundle-analyzer

# W next.config.ts:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
# module.exports = withBundleAnalyzer(nextConfig);

ANALYZE=true npm run build
```

#### c) Sprawdz, czy uzywane biblioteki sa tree-shakeable

Uzyj `import { specific } from 'lib'` zamiast `import lib from 'lib'`.

---

### PRIORYTET 5: Starszy kod JavaScript (polyfille ~12 KiB)

**Problem:** Chunk `1255-*.js` zawiera polyfille: `Array.prototype.at`, `Array.prototype.flat`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimStart/End`.

**Rozwiazanie:**

W `next.config.ts` ustaw odpowiedni `browserslist` / target. Next.js domyslnie targetuje nowoczesne przegladarki — sprawdz, czy jakas zaleznosc nie wymusza starszego targetu:

```json
// package.json
"browserslist": [
  "last 2 Chrome versions",
  "last 2 Firefox versions",
  "last 2 Safari versions",
  "last 2 Edge versions"
]
```

Lub zidentyfikuj biblioteke dostarczajaca polyfille (prawdopodobnie w chunkiem 1255) i rozważ jej zamiane.

---

### PRIORYTET 6: Czcionka Adobe TypeKit — font-display

**Problem:** Czcionka z `use.typekit.net` nie ustawia `font-display: swap`, co opoznia FCP o ~20 ms (mobile).

**Rozwiazanie:**

Jesli uzywasz TypeKit CSS (`zpt0osi.css`), dodaj do niego `&display=swap`:

```html
<!-- Zamiast: -->
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css">

<!-- Uzyj: -->
<link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css">
```

TypeKit nie obsluguje `display=swap` w URL. Alternatywy:
1. **Przejdz na Google Fonts** (obsluguje `&display=swap` natywnie)
2. **Self-host czcionke** uzywajac `next/font/local` — najlepsza opcja:

```tsx
// app/layout.tsx
import localFont from 'next/font/local';

const myFont = localFont({
  src: './fonts/MyFont.woff2',
  display: 'swap',
  variable: '--font-main',
});
```

---

### PRIORYTET 7: Nieuzywane preconnect linki

**Problem:** Dwa `preconnect` linki sa nieuzywane:
- `https://p.typekit.net`
- `https://lp1kkgv0aginmark.public.blob.vercel-storage.com`

**Rozwiazanie:**

Usun nieuzywane preconnect z `<head>`:

```tsx
// USUN te linki, jesli nie sa aktywnie uzywane:
// <link rel="preconnect" href="https://p.typekit.net" crossorigin="anonymous">
// <link rel="preconnect" href="https://lp1kkgv0aginmark.public.blob.vercel-storage.com">
```

Zachowaj tylko `preconnect` do domen, z ktorych faktycznie ladowane sa zasoby na pierwszym ekranie.

---

### PRIORYTET 8: Nieskomponowane animacje

**Problem:** Animacja logo hero (`hero-logo-reveal`, `hero-logo-plunk`) na elemencie `img.hero-logo-main` nie jest skomponowana (kompozytowana).

**Rozwiazanie:**

Uzyj wylacznie wlasciwosci `transform` i `opacity` w animacjach zamiast `top`, `left`, `width`, `height`:

```css
/* Zamiast animowania np. top/left: */
@keyframes hero-logo-reveal {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Dodaj will-change na elemencie: */
.hero-logo-main {
  will-change: transform, opacity;
}
```

---

### PRIORYTET 9: CSS blokujacy renderowanie

**Problem:** Plik CSS `f9acd500ba8b1862.css` (13 KB) blokuje renderowanie na 320 ms (mobile).

**Rozwiazanie:**

To jest glowny arkusz Next.js — trudno go wyeliminowac. Mozna:
1. **Wydzielic critical CSS inline** — Next.js robi to czesciowo automatycznie
2. **Zmniejszyc rozmiar CSS** — usun nieuzywane style (np. `purgecss` przez Tailwind — domyslnie wlaczony)
3. Sprawdz, czy `tailwind.config` ma poprawnie ustawiony `content` (by Tailwind usunal nieuzywane klasy)

---

## 3. Podsumowanie priorytetow

| # | Dzialanie | Wplyw | Trudnosc |
|---|---|---|---|
| 1 | `fetchpriority="high"` + preload obrazu LCP | Duzy (LCP) | Niska |
| 2 | Poprawne `sizes` na obrazach + mniejsza jakosc | Sredni (LCP, transfer) | Niska |
| 3 | Proporcje obrazow (lub akceptacja) | Sredni (Best Practices) | Niska/Srednia |
| 4 | Analiza i redukcja nieuzywnaego JS | Sredni (FCP, LCP) | Srednia |
| 5 | Eliminacja polyfilli | Niski (12 KB) | Niska |
| 6 | Self-host czcionki (next/font/local) | Niski-Sredni (FCP) | Srednia |
| 7 | Usun nieuzywane preconnect | Niski | Niska |
| 8 | Skomponuj animacje logo | Niski (CLS) | Niska |
| 9 | Optymalizacja CSS | Niski | Niska |

---

## 4. Szybkie wygrane (zrob najpierw)

1. Dodaj `fetchPriority="high"` do obrazu w sekcji `#rezerwuj`
2. Dodaj `sizes="(max-width: 768px) 100vw, 1335px"` do wszystkich obrazow sekcyjnych
3. Usun nieuzywane `<link rel="preconnect" ...>` z head
4. Zmien animacje logo na `transform` + `opacity`

Te 4 zmiany powinny podniesc wynik Mobile o ~10-15 punktow.
