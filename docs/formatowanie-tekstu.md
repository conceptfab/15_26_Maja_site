# Formatowanie tekstu w panelu admina

> Dotyczy pól: **Treść główna**, **Wstęp (rozwinięcie)**, **Opisy** w sekcjach Koncept, Miejsce, Rezerwacja.

---

## Pasek narzędzi

| Przycisk | Skrót | Efekt |
|----------|-------|-------|
| **B** | `Ctrl+B` | **Pogrubienie** |
| *I* | `Ctrl+I` | *Kursywa* |
| <u>U</u> | `Ctrl+U` | Podkreślenie |
| ~~S~~ | — | Przekreślenie |
| H2 | — | Nagłówek drugiego poziomu (śródtytuł) |
| H3 | — | Nagłówek trzeciego poziomu (podtytuł) |
| •— | — | Lista punktowana |
| 1. | — | Lista numerowana |
| ❝ | — | Cytat blokowy |
| 🔗 | — | Link (patrz niżej) |

---

## Jak wstawić link

1. Zaznacz tekst, który ma stać się linkiem
2. Kliknij przycisk **🔗** w pasku narzędzi
3. W oknie dialogowym wpisz URL (np. `https://hommm.pl`)
4. Zatwierdź — zaznaczony tekst stanie się linkiem

Aby **usunąć link**: kliknij na tekst z linkiem → pojawi się przycisk **✕🔗** → kliknij go.

---

## Skróty klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl+B` | Pogrubienie |
| `Ctrl+I` | Kursywa |
| `Ctrl+U` | Podkreślenie |
| `Ctrl+Z` | Cofnij |
| `Ctrl+Shift+Z` | Ponów |
| `Enter` | Nowy akapit |
| `Shift+Enter` | Nowa linia (bez nowego akapitu) |

---

## Wskazówki

- **Nie używaj H2/H3** do zwykłego tekstu — nagłówki są duże i zmieniają hierarchię strony.
- **Lista punktowana** działa dobrze dla wyliczania cech / udogodnień.
- **Cytat** (`❝`) wyróżnia ważne zdanie lub hasło.
- Edytor **zapisuje HTML** — to co widzisz w edytorze, tak (w przybliżeniu) wyświetli się na stronie.
- Po zapisaniu (`Zapisz zmiany`) podgląd w iframe odświeży się automatycznie po ~1 sekundzie.

---

## Bezpieczeństwo

Wszystkie treści są **sanityzowane** przy zapisie do bazy danych — niedozwolone tagi (skrypty, ramki itp.) są automatycznie usuwane. Dozwolone tagi: `b, strong, i, em, u, s, a, h2, h3, p, br, ul, ol, li, blockquote, code`.
