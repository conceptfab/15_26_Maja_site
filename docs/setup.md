# Setup projektu HOMMM

## Zakres

Ten dokument opisuje uruchomienie lokalnego stanu repo po realizacji Faz 0-2. Aktualna implementacja developerska korzysta z lokalnej bazy SQLite (`dev.db`) przez adapter `better-sqlite3`, mimo ze plan docelowy zaklada PostgreSQL na Railway.

## Wymagania

- Node.js 20+
- npm 10+
- Powershell lub inna powloka do uruchamiania komend

Nie jest potrzebna zewnetrzna baza danych, o ile pracujesz na aktualnym lokalnym setupie.

## Zmienne srodowiskowe

Repo nie zawiera `.env.example`, wiec plik `.env` trzeba przygotowac recznie w katalogu projektu.

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `DATABASE_URL` | tak | Uzywana przez Prisma CLI. Dla lokalnego setupu ustaw `file:./dev.db` |
| `JWT_SECRET` | tak | Sekret do podpisywania JWT, minimum 32 znaki |
| `ADMIN_SECRET_CODE` | tak | Wspolny kod logowania do panelu admina, minimum 12 znakow |
| `ADMIN_EMAIL` | nie | Email seedowanego admina. Gdy brak, seed uzywa `admin@example.com` |

Przykladowa konfiguracja:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-random-string-of-at-least-32-characters"
ADMIN_SECRET_CODE="replace-with-a-secret-code-12-plus"
ADMIN_EMAIL="admin@example.com"
```

## Szybki start

1. Zainstaluj zaleznosci:

```bash
npm install
```

2. Utworz i wypelnij `.env`.

3. Wygeneruj klienta Prisma:

```bash
npm run db:generate
```

4. Zastosuj schemat do lokalnej bazy:

```bash
npm run db:push
```

5. Zasiej dane startowe:

```bash
npm run db:seed
```

6. Uruchom aplikacje:

```bash
npm run dev
```

Po starcie:

- strona publiczna: `http://localhost:3000`
- panel admina: `http://localhost:3000/admin/login`

## Dane startowe

Seed tworzy:

- konto admina z emailem z `ADMIN_EMAIL`,
- strone `home`,
- sekcje `hero`, `koncept`, `miejsce`, `rezerwacja`, `kontakt`,
- kilka podstawowych rekordow `SiteSettings`.

Do logowania uzyj:

- emaila z `ADMIN_EMAIL`,
- kodu z `ADMIN_SECRET_CODE`.

## Komendy developerskie

| Komenda | Opis |
|---------|------|
| `npm run dev` | serwer developerski Next.js |
| `npm run build` | build produkcyjny |
| `npm run start` | uruchomienie buildu |
| `npm run lint` | linting projektu |
| `npm run db:generate` | generowanie klienta Prisma |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | szybkie zsynchronizowanie schematu z DB |
| `npm run db:seed` | seed danych startowych |
| `npm run db:studio` | GUI do przegladania danych |

## Jak dziala lokalna baza

Sa tu dwa poziomy konfiguracji, ktore warto odroznic:

- Prisma CLI korzysta z `DATABASE_URL` z `prisma.config.ts`,
- runtime aplikacji (`lib/db.ts`) i seed (`prisma/seed.ts`) tworza polaczenie do `file:dev.db` przez adapter `better-sqlite3`.

W praktyce oznacza to, ze lokalny setup jest zorientowany na SQLite i pojedynczy plik bazy w katalogu projektu.

## Najczestsze problemy

| Problem | Przyczyna | Rozwiazanie |
|---------|-----------|-------------|
| `Missing required environment variable` | brakuje wpisu w `.env` | uzupelnij `.env` i uruchom polecenie ponownie |
| brak logowania do admina po seedzie | seed stworzyl inne konto niz oczekiwane | sprawdz `ADMIN_EMAIL` w `.env` albo otworz `npm run db:studio` |
| Prisma nie widzi modeli | klient nie zostal wygenerowany po zmianach | uruchom `npm run db:generate` |
| przekierowanie z `/admin/*` na login | brak lub niewazna cookie sesyjna | zaloguj sie ponownie przez `/admin/login` |
