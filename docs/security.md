# Bezpieczeństwo HOMMM

## Security Headers

Konfiguracja w `next.config.ts`, aplikowana na wszystkie ścieżki:

| Header | Wartość | Cel |
|--------|---------|-----|
| `X-Content-Type-Options` | `nosniff` | Zapobiega MIME type sniffing |
| `X-Frame-Options` | `DENY` | Zapobiega clickjacking (iframe) |
| `X-XSS-Protection` | `1; mode=block` | Ochrona XSS w starszych przeglądarkach |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kontrola nagłówka Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blokuje dostęp do kamery/mikrofonu/GPS |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Wymusza HTTPS (HSTS) |

## Autentykacja

- **httpOnly cookies** — JWT niedostępny z JavaScript (ochrona przed XSS)
- **secure flag** — cookie wysyłany tylko po HTTPS (produkcja)
- **sameSite: lax** — ochrona CSRF
- **Sesje w DB** — możliwość natychmiastowego unieważnienia
- **Czyszczenie sesji** — wygasłe sesje usuwane przy każdym logowaniu

## Walidacja danych

- **Zod** — walidacja na serwerze dla wszystkich inputów
- Schematy współdzielone front/back (single source of truth)

## Baza danych

- **Prisma** — parametryzowane zapytania (ochrona SQL injection)
- **Railway PostgreSQL** — szyfrowanie w tranzycie (SSL)

## HTTPS

- Railway zapewnia automatyczne certyfikaty Let's Encrypt
- HSTS header wymusza HTTPS po pierwszym połączeniu

## Ochrona endpointów

- `/admin/*` — chronione middleware (JWT verification)
- `/api/auth/*` — publiczne (login/logout)
- `/api/reservations` — publiczne (docelowo z rate limiting)

## TODO (przyszłe fazy)

- Rate limiting na API (in-memory, Faza 3)
- CSP header (Content Security Policy) — wymaga audytu inline styles
- CSRF token dla Server Actions
