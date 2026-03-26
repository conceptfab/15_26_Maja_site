# System zarzadzania trescia (CMS)

## Zakres

Po Fazie 2 CMS pozwala adminowi edytowac tresc glownej strony HOMMM w dwoch jezykach. Zakres wdrozenia obejmuje istniejace sekcje strony `home`, a nie pelny, dowolnie rozszerzalny builder stron.

## Z czego sklada sie system

| Obszar | Plik / model | Rola |
|--------|--------------|------|
| Dane strony | `Page`, `Section` w Prisma | przechowywanie tresci i kolejnosci |
| Pobranie tresci publicznej | `lib/content.ts` | czyta sekcje z DB i daje fallback |
| Akcje CMS | `actions/content.ts` | lista sekcji, sekcja po slugu, zapis zmian |
| Lista sekcji w panelu | `app/admin/content/page.tsx` | wejscie do edycji |
| Edytor sekcji | `app/admin/content/[slug]/SectionEditor.tsx` | formularz PL/EN + podglad |
| Sidebar admina | `app/api/content/sections/route.ts` | lekka lista slugow i nazw |

## Model danych

### Strona

Aktualnie CMS obsluguje jedna strone:

- `Page.slug = "home"`
- `Page.isHome = true`

### Sekcja

Najwazniejsze pola w `Section`:

| Pole | Znaczenie |
|------|-----------|
| `slug` | techniczny identyfikator sekcji |
| `order` | kolejnosc renderowania |
| `titlePl` / `titleEn` | nazwa sekcji w panelu |
| `contentPl` / `contentEn` | JSON z polami tekstowymi |
| `isVisible` | flaga widocznosci w modelu |
| `bgImage` / `bgColor` | pola wygladu zapisane w DB |

## Jak frontend pobiera tresc

```text
app/page.tsx
  -> getHomeContent()
       -> pobierz sekcje strony home z DB
       -> uporzadkuj po order asc
       -> gdy blad albo brak danych: fallback na content statyczny
  -> HomeClient
       -> wybierz contentPl albo contentEn
       -> wyrenderuj znane sekcje
```

## Aktualny zestaw sekcji

| Slug | Rola | Obslugiwane pola tekstowe |
|------|------|---------------------------|
| `hero` | branding hero | `heading`, `subheading` |
| `koncept` | sekcja opisu miejsca | `heading`, `subheading`, `body`, `intro` |
| `miejsce` | druga sekcja opisu | `heading`, `subheading`, `body`, `intro` |
| `rezerwacja` | panel rezerwacji | `title`, `description`, `description2`, `checkin`, `checkout`, `guests_label`, `submit`, `note`, `clear`, `info`, `night_one`, `night_few`, `night_many`, `guest_one`, `guest_few` |
| `kontakt` | stopka i dane kontaktowe | `email`, `phone`, `company`, `address`, `nip` |

## Struktura JSON

### Zasada praktyczna

Mimo ze `contentPl` i `contentEn` sa technicznie polami `Json`, obecna implementacja traktuje je jak plaskie slowniki `string -> string`.

`jsonToRecord()` w edytorze:

- zamienia obiekt JSON na rekord stringow,
- niestringowe wartosci serializuje do JSON stringa.

W praktyce najlepiej trzymac tam proste pola tekstowe.

### Przyklad: `hero`

```json
{
  "heading": "YOUR SPECIAL TIME",
  "subheading": "HOMMM"
}
```

### Przyklad: `kontakt`

```json
{
  "email": "hommm@hommm.eu",
  "phone": "+48 608 259 945",
  "company": "Banana Gun Design Maria Budner",
  "address": "ul. Sanocka 39 m 5, 93-038 Lodz",
  "nip": "7292494164"
}
```

## Edytor admina

### Widok listy

`/admin/content`:

- pobiera sekcje przez `getContent()`,
- pokazuje badge widocznosci,
- buduje preview z pierwszego sensownego pola (`body`, `heading`, `subheading`, `intro`, `email`).

### Widok szczegolow

`/admin/content/[slug]`:

- ma osobne zakladki `PL` i `EN`,
- pozwala zmieniac nazwe sekcji w panelu,
- pozwala edytowac pola tekstowe zdefiniowane dla danego slugu,
- pozwala ustawic `bgImage`, `bgColor` i `isVisible`,
- pokazuje live preview w `iframe`.

### Live preview

Edytor wysyla zmiany przez `postMessage` z typem `cms-live-preview`. `HomeClient.tsx` nasluchuje tej wiadomosci i tymczasowo nadpisuje tresc sekcji bez czekania na zapis do bazy.

## Ograniczenia obecnego CMS

| Obszar | Ograniczenie |
|--------|--------------|
| Dynamicznosc | frontend renderuje tylko z gory znane slugi |
| `isVisible` | flaga jest zapisywana, ale publiczny frontend nie ukrywa jeszcze sekcji na jej podstawie |
| `bgImage` / `bgColor` | pola sa edytowalne, ale publiczna warstwa jeszcze ich nie uzywa |
| Typy pol | edytor zaklada glownie pola tekstowe; brak dedykowanej obslugi tablic, galerii z DB i blokow zagniezdzonych |

## Jak dodac nowa sekcje

Dodanie nowej sekcji wymaga zmian w kilku miejscach:

1. dodaj rekord `Section` do seeda albo bazy, powiazany ze strona `home`,
2. uzupelnij `contentPl` i `contentEn`,
3. dodaj ikone w `lib/section-icons.ts`,
4. rozszerz `components/HomeClient.tsx`, aby nowy slug byl rzeczywiscie renderowany,
5. opcjonalnie dodaj opisy pol w `FIELD_LABELS` w `SectionEditor.tsx`,
6. jesli sekcja ma miec sensowny podglad w iframe, dopisz mapowanie slugu do kotwicy.

## Wnioski

CMS po Fazie 2 rozwiazuje kluczowy problem biznesowy: copy i tresc sekcji nie sa juz zaszyte tylko w kodzie. Nadal jednak jest to CMS "sekcyjny", a nie pelny builder stron - zmieniasz tresc istniejacych blokow, ale sama struktura frontendu pozostaje kontrolowana przez kod.
