# Bezpieczenstwo HOMMM

## Zakres

Dokument opisuje biezace zabezpieczenia po Fazie 1 oraz miejsca, ktore sa dopiero przygotowane pod dalsze wdrozenia.

## Security headers

Naglowki sa ustawiane globalnie w `next.config.ts`.

| Header | Wartosc | Cel |
|--------|---------|-----|
| `X-Content-Type-Options` | `nosniff` | ogranicza MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | ogranicza osadzanie strony w obcych frame'ach |
| `X-XSS-Protection` | `1; mode=block` | wsparcie dla starszych przegladarek |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ogranicza wycieki naglowka referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | blokuje wybrane API przegladarki |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | wymusza HTTPS po stronie przegladarki |

## Sekrety i konfiguracja

Sekrety nie sa zaszyte w kodzie. Runtime pobiera je z `.env` przez `lib/env.ts`.

Wymagania walidowane przy starcie:

- `JWT_SECRET` musi miec co najmniej 32 znaki,
- `ADMIN_SECRET_CODE` musi miec co najmniej 12 znakow.

## Sesja admina

### Co chroni system

- cookie `admin_session` jest `httpOnly`,
- `secure` wlacza sie w produkcji,
- `sameSite=lax` zmniejsza ryzyko prostych scenariuszy CSRF,
- sesja ma odporny na manipulacje podpis JWT,
- rekord `Session` w DB pozwala uniewaznic sesje po stronie serwera.

### Granice ochrony

| Warstwa | Co sprawdza |
|--------|-------------|
| `middleware.ts` | obecnosci cookie, podpis JWT, wygasniecie |
| `verifySession()` | JWT + rekord `Session` + aktywnosc admina |

## Walidacja danych

Aktualnie aktywna jest walidacja Zod dla logowania:

- `email` musi byc prawidlowym adresem email,
- `secretCode` musi byc przekazany w payloadzie.

To jest jeszcze waski zakres - kolejne publiczne formularze nie sa wdrozone.

## Ochrona warstwy danych

| Obszar | Stan |
|--------|------|
| ORM | Prisma ogranicza ryzyko SQL injection przez parametryzacje |
| Lokalna baza | runtime korzysta z SQLite `dev.db` |
| Sesje | zapisywane w tabeli `Session`, z mozliwoscia kasowania wygaslych rekordow |

## Ochrona tras i mutacji

| Obszar | Stan |
|--------|------|
| `/admin/*` | chronione przez middleware |
| `actions/content.updateContent()` | wymaga `verifySession()` |
| `/api/auth/*` | publiczne endpointy auth |
| `/api/content/sections` | publiczny endpoint pomocniczy dla sidebara admina |

## Dostepnosc jako element bezpieczenstwa operacyjnego

W praktyce wdrozone zostaly tez dwa elementy zmniejszajace ryzyko bledow obslugi:

- skip link do tresci,
- prosty i czytelny panel admina bez zbednych sciezek.

To nie sa zabezpieczenia kryptograficzne, ale ograniczaja przypadkowe bledy uzytkownika i poprawiaja przewidywalnosc interfejsu.

## Luki i elementy jeszcze niewdrozone

| Obszar | Stan obecny | Plan |
|--------|-------------|------|
| CSP | brak | do dodania po audycie stylow i assetow |
| Rate limiting | brak | planowany dla logowania i przyszlych endpointow publicznych |
| Sanitization warstwy CMS | brak dedykowanej sanityzacji inputow | do rozwazenia przy bogatszych polach i uploadach |
| CSRF tokeny | brak osobnej implementacji | na razie tylko `sameSite` i mechanika server actions |
| Audyt automatyczny | brak | faza testow i security audit |
| Monitoring logowan | brak | mozliwy dalszy etap administracyjny |

## Wnioski

Na obecnym etapie bezpieczenstwo jest wystarczajace dla prostego panelu admina i lokalnego developmentu: sa sekrety w env, podpisywane JWT, sesje w DB i podstawowe naglowki HTTP. Najwieksze braki wzgledem pelnego planu to brak CSP, brak rate limitingu i brak rozszerzonej walidacji dla kolejnych flow, ktore dopiero beda wdrazane.
