# Setup projektu HOMMM

## Wymagania

- Node.js 20+
- PostgreSQL (lokalnie lub Railway)
- npm

## Szybki start

1. **Klonuj repo i zainstaluj zależności:**
   ```bash
   git clone <repo-url>
   cd 15_26_Maja_site
   npm install
   ```

2. **Skonfiguruj zmienne środowiskowe:**
   ```bash
   cp .env.example .env
   ```
   Wypełnij `.env`:
   - `DATABASE_URL` — connection string PostgreSQL
   - `JWT_SECRET` — losowy ciąg do podpisywania tokenów JWT
   - `ADMIN_SECRET_CODE` — kod dostępu do panelu admina
   - `ADMIN_EMAIL` — email admina (whitelist)

3. **Przygotuj bazę danych:**
   ```bash
   npm run db:push      # Wypchnij schemat do DB
   npm run db:seed      # Wypełnij danymi początkowymi
   ```

4. **Uruchom dev server:**
   ```bash
   npm run dev
   ```
   - Strona: http://localhost:3000
   - Panel admina: http://localhost:3000/admin/login

## Komendy

| Komenda | Opis |
|---------|------|
| `npm run dev` | Dev server |
| `npm run build` | Build produkcyjny |
| `npm run start` | Uruchom build |
| `npm run lint` | Sprawdź kod |
| `npm run db:generate` | Wygeneruj klienta Prisma |
| `npm run db:migrate` | Uruchom migracje |
| `npm run db:push` | Wypchnij schemat (dev) |
| `npm run db:seed` | Seeduj dane |
| `npm run db:studio` | Prisma Studio (GUI) |

## Railway deployment

1. Utwórz projekt na Railway z PostgreSQL
2. Dodaj zmienne środowiskowe w Railway dashboard
3. Build command: `npm run build`
4. Start command: `npm run start`
