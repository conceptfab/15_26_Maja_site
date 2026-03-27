# Galeria — dokumentacja

## Architektura

Zdjecia przechowywane sa lokalnie w katalogu `uploads/gallery/` (na Railway — Volume mount via `UPLOAD_DIR`).

Kazde zdjecie generuje 3 warianty:
- **original** — oryginalny plik (zachowany format)
- **webp** — zoptymalizowany WebP (quality 82)
- **thumb** — miniatura WebP (max 400px szerokosc)

Przetwarzanie odbywa sie przez **Sharp** w server action `uploadImage()`.

## Struktura plikow

```
uploads/gallery/
  {id}_original.{ext}   — oryginal
  {id}.webp              — zoptymalizowany WebP
  {id}_thumb.webp        — miniatura
```

## Baza danych (model GalleryImage)

| Pole        | Typ      | Opis                               |
|-------------|----------|-------------------------------------|
| id          | cuid     | Unikalny identyfikator              |
| sectionId   | string?  | Przypisanie do sekcji (opcjonalne)  |
| originalUrl | string   | URL do oryginalu                    |
| webpUrl     | string   | URL do WebP                         |
| thumbUrl    | string?  | URL do miniatury                    |
| altPl       | string?  | Alt text PL                         |
| altEn       | string?  | Alt text EN                         |
| order       | int      | Kolejnosc wyswietlania              |

## Server Actions (`actions/gallery.ts`)

| Action              | Opis                                        |
|---------------------|---------------------------------------------|
| `uploadImage(fd)`   | Upload + Sharp (WebP + thumb) + zapis do DB |
| `deleteImage(id)`   | Usuniecie pliku z dysku + rekordu z DB      |
| `updateImageOrder`  | Zmiana kolejnosci (drag & drop)             |
| `updateImageAlt`    | Edycja alt text PL/EN                       |
| `updateImageSection`| Przypisanie do sekcji                       |
| `getGalleryImages`  | Pobranie wszystkich zdjec                   |

## Serwowanie plikow

Pliki serwowane przez API route: `/api/uploads/[...path]`
- Obsluguje: `.webp`, `.jpg`, `.jpeg`, `.png`, `.avif`
- Cache: `public, max-age=31536000, immutable`
- Zabezpieczenie przed path traversal

## Limity

- Max rozmiar pliku: **10 MB**
- Dozwolone formaty: JPEG, PNG, WebP, AVIF
- Miniatura: max **400px** szerokosc
- WebP quality: **82**

## Panel admina (`/admin/gallery`)

- Grid z miniaturami
- Drag & drop upload (przeciagnij pliki na strone)
- Drag & drop zmiana kolejnosci
- Dialog edycji: alt text PL/EN, przypisanie do sekcji
- Usuwanie zdjec

## Integracja z frontem

Sekcje `koncept` i `miejsce` laduja galerie z DB (pole `galleryImages` w `SectionContent`).
Jesli brak zdjec w DB — fallback na statyczne pliki z `/assets/`.

## Railway Volume (produkcja)

Ustaw zmienna srodowiskowa:
```
UPLOAD_DIR=/data/uploads
```

Gdzie `/data` to zamontowany Volume w Railway.
