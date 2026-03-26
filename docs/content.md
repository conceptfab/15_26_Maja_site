# System zarzadzania trescia (CMS)

## Architektura

Tresc strony przechowywana jest w tabeli `Section` (Prisma) i powiazana z `Page` (slug: `home`).

Kazda sekcja ma:
- `slug` — unikalny identyfikator (np. `hero`, `koncept`, `miejsce`, `kontakt`)
- `titlePl` / `titleEn` — tytuły w dwoch jezykach
- `contentPl` / `contentEn` — JSON z polami tresci (np. `heading`, `subheading`, `body`)
- `bgImage` / `bgColor` — tlo sekcji
- `isVisible` — widocznosc na stronie
- `order` — kolejnosc wyswietlania

## Struktura JSON tresci sekcji

### hero
```json
{ "heading": "YOUR SPECIAL TIME", "subheading": "HOMMM" }
```

### koncept
```json
{
  "heading": "YOUR SPECIAL TIME",
  "subheading": "KONCEPT HOMMM",
  "body": "Tekst glowny sekcji...",
  "intro": "Krotki wstep do rozszerzonej tresci"
}
```

### miejsce
```json
{
  "heading": "YOUR SPECIAL PLACE",
  "subheading": "CHCESZ WYPOCZAC...",
  "body": "Tekst glowny...",
  "intro": "Krotki wstep..."
}
```

### kontakt
```json
{
  "email": "hommm@hommm.eu",
  "phone": "+48 608 259 945",
  "company": "Banana Gun Design Maria Budner",
  "address": "ul. Sanocka 39 m 5, 93-038 Lodz",
  "nip": "7292494164"
}
```

## Server Actions

Plik: `actions/content.ts`

| Funkcja | Opis | Autoryzacja |
|---------|------|-------------|
| `getContent()` | Lista wszystkich sekcji strony glownej | Nie |
| `getContentBySlug(slug)` | Pojedyncza sekcja wg slug | Nie |
| `updateContent(slug, data)` | Aktualizacja sekcji | Tak (JWT) |

## Panel admina

- `/admin/content` — lista sekcji (Table z podgladem)
- `/admin/content/[slug]` — edytor sekcji z tabami PL/ENG

## Fallback

Gdy baza danych jest niedostepna, strona glowna uzywa statycznych danych z `data/content.ts`.

## Jak dodac nowa sekcje

1. Dodaj rekord do seed (`prisma/seed.ts`) lub recznie w Prisma Studio
2. Upewnij sie, ze `pageId` wskazuje na strone glowna (slug: `home`)
3. Ustaw unikalne pole `slug`
4. Dodaj obsluge w `components/HomeClient.tsx` (renderowanie sekcji)
