# Autentykacja HOMMM

## Zakres

Ten dokument opisuje aktualny system logowania po Fazie 1. Autentykacja dotyczy tylko panelu admina i nie obejmuje jeszcze zadnych rol poza prostym dostepem administratora.

## Elementy systemu

| Obszar | Plik / model | Rola |
|--------|--------------|------|
| Formularz logowania | `app/admin/login/page.tsx` | pobiera email i secret code |
| Login API | `app/api/auth/login/route.ts` | waliduje dane i tworzy sesje |
| Logout API | `app/api/auth/logout/route.ts` | usuwa sesje i cookie |
| Sesja bieaca | `app/api/auth/me/route.ts` | zwraca aktywnego admina |
| Logika auth | `lib/auth.ts` | tworzenie, weryfikacja i niszczenie sesji |
| Guard na routing | `middleware.ts` | chroni `/admin/*` przed wejsciem bez cookie |
| Dane trwale | `Admin`, `Session` w `prisma/schema.prisma` | whitelist adminow i historia sesji |

## Model logowania

System opiera sie na dwoch warunkach:

1. email musi znajdowac sie na whiteliscie w tabeli `Admin`,
2. podany secret code musi byc zgodny z `ADMIN_SECRET_CODE`.

Nie ma tu hasel per uzytkownik i nie ma resetowania hasla. To swiadomie uproszczony model dla malego zespolu.

## Flow logowania

```text
admin -> /admin/login
  -> POST /api/auth/login
       -> Zod waliduje email i secretCode
       -> serwer porownuje secretCode z ADMIN_SECRET_CODE
       -> serwer szuka aktywnego admina w tabeli Admin
       -> createSession(admin.id)
            -> kasuje wygasle sesje
            -> podpisuje JWT
            -> zapisuje rekord Session
            -> ustawia cookie admin_session
  -> frontend przechodzi na /admin/dashboard
```

## JWT i cookie

### Payload i czas zycia

- JWT zawiera `adminId`,
- czas zycia sesji wynosi 7 dni,
- ten sam termin jest wpisywany do rekordu `Session.expiresAt`.

### Ustawienia cookie

| Wlasciwosc | Wartosc |
|------------|---------|
| nazwa | `admin_session` |
| `httpOnly` | `true` |
| `secure` | `true` tylko w `NODE_ENV=production` |
| `sameSite` | `lax` |
| `path` | `/` |
| wygasniecie | 7 dni od logowania |

## Ochrona tras

### Middleware

`middleware.ts` przechwytuje `/admin/:path*` z wyjatkiem `/admin/login`.

Middleware:

- sprawdza obecnosci cookie `admin_session`,
- weryfikuje podpis i wygasniecie JWT,
- przy bledzie usuwa cookie i robi redirect na `/admin/login`.

### Weryfikacja pelnej sesji

Wazny niuans implementacyjny: middleware nie sprawdza sesji w bazie danych. Pelne potwierdzenie sesji robi dopiero `verifySession()` w `lib/auth.ts`, ktore:

- pobiera cookie,
- weryfikuje JWT,
- sprawdza rekord `Session` w DB,
- upewnia sie, ze admin jest aktywny.

To oznacza, ze:

- wejscie na chroniona strone jest pilnowane przez lekki guard w middleware,
- akcje serwerowe i `GET /api/auth/me` opieraja sie juz na twardszej weryfikacji DB.

## Logout

`POST /api/auth/logout`:

- usuwa rekord sesji powiazany z aktualnym tokenem,
- kasuje cookie `admin_session`.

## Endpointy auth

| Metoda | URL | Dzialanie |
|--------|-----|-----------|
| `POST` | `/api/auth/login` | logowanie i ustawienie cookie |
| `POST` | `/api/auth/logout` | wylogowanie |
| `GET` | `/api/auth/me` | zwrot danych aktualnego admina albo `401` |

## Dodawanie admina

### Opcja 1: seed

Seed tworzy jednego admina na podstawie `ADMIN_EMAIL`.

### Opcja 2: Prisma Studio

```bash
npm run db:studio
```

Dodaj rekord w tabeli `Admin` z:

- unikalnym `email`,
- `isActive = true`.

## Zmienne srodowiskowe

| Zmienna | Znaczenie |
|---------|-----------|
| `JWT_SECRET` | sekret do podpisywania JWT, min. 32 znaki |
| `ADMIN_SECRET_CODE` | wspolny kod logowania, min. 12 znakow |
| `ADMIN_EMAIL` | email seedowanego administratora |

## Ograniczenia i dalsze kroki

| Obszar | Stan obecny | Plan |
|--------|-------------|------|
| Rate limiting logowania | brak | kolejna faza security |
| Role i uprawnienia | brak | poza zakresem obecnego MVP |
| Pelna weryfikacja sesji w middleware | brak | mozliwa optymalizacja / uszczelnienie w kolejnym etapie |
| Logowanie bez wspolnego kodu | brak | nieplanowane w obecnym zakresie |
