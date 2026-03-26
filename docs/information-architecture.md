# Architektura informacji — HOMMM

## 1. Hierarchia tresci

Strona glowna jest single-page z sekcjami. Ponizej hierarchia od gory do dolu:

```
HOMMM — Strona glowna (/)
│
├── [1] HERO (id: hero-start)
│   ├── Logo HOMMM (pierwsze wrazenie, brand)
│   ├── Tryb "miejsca" — galeria zdjec obiektu
│   └── Tryb "rezerwuj" — formularz rezerwacji
│       ├── Wybor dat (DatePicker: check-in / check-out)
│       ├── Liczba gosci
│       ├── Podsumowanie (noce × cena)
│       └── Przycisk "Rezerwuj"
│
├── [2] KONCEPT HOMMM (id: sec2-wrapper, slug: "koncept")
│   ├── Tytul: "YOUR SPECIAL TIME"
│   ├── Podtytul: "KONCEPT HOMMM"
│   ├── Przycisk "Czytaj wiecej"
│   └── Rozwiniety content:
│       ├── Naglowek + intro
│       ├── Tresc (3 paragrafy)
│       └── Galeria (3 zdjecia)
│
├── [3] MIEJSCE (id: sec3-wrapper, slug: "miejsce")
│   ├── Tytul: "YOUR SPECIAL PLACE"
│   ├── Podtytul: pytanie zachecajace
│   ├── Przycisk "Czytaj wiecej"
│   └── Rozwiniety content:
│       ├── Naglowek + intro
│       ├── Tresc (3 paragrafy)
│       └── Galeria (3 zdjecia)
│
└── [4] FOOTER (id: sec4-wrapper, slug: "kontakt")
    ├── Logo HOMMM
    ├── Nawigacja (powtorzenie menu)
    ├── Dane korporacyjne (NIP, nazwa firmy)
    ├── Kontakt (email, telefon)
    ├── Social media (Instagram, TikTok, Facebook)
    └── Baner promocyjny
```

### Docelowa hierarchia (po CMS — Faza 2)

Sekcje beda zarzadzane z panelu admina. Kazda sekcja ma slug, kolejnosc, widocznosc i tresc PL/ENG.

Planowane slugi w CMS:

| Slug | Sekcja | Opis |
|------|--------|------|
| `hero` | Hero | Glowny widok + rezerwacja |
| `koncept` | Koncept HOMMM | O obiekcie — filozofia |
| `miejsce` | Miejsce | Lokalizacja, otoczenie |
| `kontakt` | Footer/Kontakt | Dane kontaktowe, social media |

Nowe sekcje (opcjonalne, dodawane przez admina w przyszlosci):
- `cennik` — oddzielna sekcja cennikowa (jesli potrzebna)
- `opinie` — referencje gosci
- `faq` — czesto zadawane pytania

---

## 2. Nawigacja

### Obecna nawigacja (TopMenu)

```
┌─────────────────────────────────────────┐
│  [LOGO]    KONCEPT  MIEJSCA  REZERWUJ   │
│                                  PL|EN  │
└─────────────────────────────────────────┘
```

| Pozycja | Akcja | Cel |
|---------|-------|-----|
| KONCEPT | Scroll do sec2-wrapper | Sekcja "Koncept HOMMM" |
| MIEJSCA | Przelaczenie hero na tryb galerii | Galeria zdjec obiektu |
| REZERWUJ | Przelaczenie hero na tryb rezerwacji | Formularz rezerwacji |
| PL | Aktywny jezyk (polski) | — |
| EN | Nieaktywny (brak implementacji) | Przelaczenie na angielski |

### Mobile (< 769px)

- Hamburger menu (3 kreski)
- Pelnoekranowe overlay z linkami
- Zamkniecie: klik na X lub Escape
- aria-label: "Otworz menu" / "Zamknij menu"

### Docelowa nawigacja (po i18n — Faza 2)

Bez zmian w strukturze. Zmiany:
- PL/EN przelacznik aktywny (zapis jezyka w cookie)
- Etykiety menu tlumaczone z `messages/pl.json` / `messages/en.json`
- `lang` na `<html>` zmienia sie dynamicznie

---

## 3. Taxonomia sekcji w CMS

Kazda sekcja w bazie danych (tabela `Section`) bedzie miala:

| Pole | Typ | Opis |
|------|-----|------|
| slug | String (unique) | Identyfikator sekcji (np. "hero", "koncept") |
| order | Int | Kolejnosc wyswietlania (1, 2, 3, 4) |
| isVisible | Boolean | Czy sekcja jest widoczna na stronie |
| titlePl / titleEn | String | Tytul sekcji PL/ENG |
| contentPl / contentEn | JSON | Struktura tresci (paragrafy, galeria, intro) |
| bgImage | String? | Sciezka do obrazu tla |
| bgColor | String? | Kolor tla (fallback) |
| tags | String[] | Tagi sekcji (do filtrowania/grupowania) |

### Przykladowa struktura JSON content

```json
{
  "heading": "KONCEPT HOMMM",
  "intro": "Krotki wstep...",
  "body": [
    "Paragraf pierwszy...",
    "Paragraf drugi...",
    "Paragraf trzeci..."
  ],
  "gallery": [
    { "src": "/uploads/gal_00.webp", "alt": "Opis zdjecia" },
    { "src": "/uploads/gal_01.webp", "alt": "Opis zdjecia" }
  ]
}
```

---

## 4. Mapa strony (Sitemap)

### Strony publiczne

| URL | Opis | Priorytet | Czestotliwosc |
|-----|------|-----------|---------------|
| `/` | Strona glowna (wszystkie sekcje) | 1.0 | weekly |

### Strony admina (nie indeksowane)

| URL | Opis |
|-----|------|
| `/admin/login` | Logowanie |
| `/admin/dashboard` | Dashboard |
| `/admin/content` | Zarzadzanie trescia |
| `/admin/reservations` | Lista rezerwacji |
| `/admin/calendar` | Kalendarz dostepnosci |
| `/admin/gallery` | Galeria |
| `/admin/seo` | Ustawienia SEO |
| `/admin/settings` | Ustawienia globalne |

### Implementacja sitemap (Faza 5)

Plik `app/sitemap.ts` (Next.js convention):

```typescript
export default function sitemap() {
  return [
    {
      url: 'https://hommm.eu',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
```

### Robots.txt (Faza 5)

```
User-agent: *
Allow: /
Disallow: /admin/
Sitemap: https://hommm.eu/sitemap.xml
```

---

## 5. Dane strukturalne (Faza 5)

JSON-LD do osadzenia w `<head>`:

```json
{
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": "HOMMM",
  "description": "Apartament w otoczeniu natury",
  "url": "https://hommm.eu",
  "telephone": "+48 ...",
  "email": "hommm@hommm.eu",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "PL"
  },
  "priceRange": "204.5 PLN/noc"
}
```

---

## 6. Flow informacji: Frontend ↔ Backend

```
GOSC (przegladarka)
  │
  ├─ GET / ──────────────► Server Component (page.tsx)
  │                            │
  │                            ├─ Prisma: pobierz sekcje z DB
  │                            │   (fallback: data/content.ts)
  │                            │
  │                            ├─ Prisma: pobierz ustawienia SEO
  │                            │   (generateMetadata)
  │                            │
  │                            └─ Renderuj HTML z trescia PL lub ENG
  │                                (wg cookie jezyka)
  │
  ├─ GET /api/reservations/availability
  │     └──────────────────► Zwroc zajete daty (publiczny endpoint)
  │
  └─ POST /api/reservations
        └──────────────────► Walidacja Zod → zapis do DB → email do goscia + admina


ADMIN (panel /admin/*)
  │
  ├─ Auth: JWT w httpOnly cookie (jose)
  │
  ├─ Server Actions (chronione):
  │   ├─ getContent() / updateContent()
  │   ├─ getReservations() / updateReservationStatus()
  │   ├─ uploadImage() / deleteImage()
  │   ├─ getSeoSettings() / updateSeoSettings()
  │   └─ getSettings() / updateSettings()
  │
  └─ Mutacje → revalidatePath('/') → odswiezenie strony publicznej
```

---

## 7. Podsumowanie decyzji architektonicznych

| Decyzja | Uzasadnienie |
|---------|-------------|
| Single-page (1 strona publiczna) | Obiekt ma 1 apartament; wszystkie informacje na jednej stronie |
| Sekcje jako JSON w DB | Elastyczna struktura bez zmian schematu; admin edytuje tresc |
| Fallback na statyczna tresc | Strona dziala nawet bez DB (degradacja graceful) |
| Server Components domyslnie | Mniej JS po stronie klienta; szybsze ladowanie |
| Cookie do jezyka | Proste, bez URL rewrite; 1 strona = 1 URL |
| Anchor navigation | Single-page — nawigacja przez scroll do sekcji |
| Admin pod /admin/* | Oddzielona logicznie; chroniona JWT middleware |
