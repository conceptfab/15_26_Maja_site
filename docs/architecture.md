# Architektura HOMMM

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 15 (App Router) |
| UI publiczna | Custom CSS + React 19 |
| UI admina | shadcn/ui + Tailwind CSS 4 |
| Baza danych | PostgreSQL (Railway) |
| ORM | Prisma |
| Autentykacja | Custom (jose JWT + httpOnly cookie) |
| Walidacja | Zod |

## Struktura katalogów

```
app/
├── layout.tsx              # Root layout (publiczny)
├── page.tsx                # Strona główna
├── globals.css             # Style publiczne
├── admin/
│   ├── layout.tsx          # Layout admina (dark mode, Tailwind)
│   ├── admin.css           # Style Tailwind dla admina
│   ├── page.tsx            # Redirect → dashboard
│   ├── login/page.tsx      # Formularz logowania
│   └── dashboard/page.tsx  # Dashboard ze statystykami
├── api/auth/
│   ├── login/route.ts      # POST: email + secret code → JWT
│   ├── logout/route.ts     # POST: usuń sesję
│   └── me/route.ts         # GET: aktualna sesja

components/
├── admin/AdminShell.tsx    # Shell admina (sidebar + topbar)
├── ui/                     # shadcn/ui komponenty
├── TopMenu.tsx             # Menu publiczne
└── Icons.tsx               # Ikony SVG

lib/
├── db.ts                   # Prisma singleton
├── auth.ts                 # JWT, sesje, cookies
├── validations.ts          # Schematy Zod
├── utils.ts                # Utility (cn)
└── generated/prisma/       # Wygenerowany klient Prisma

prisma/
├── schema.prisma           # Schemat bazy danych
└── seed.ts                 # Dane początkowe

middleware.ts               # Ochrona /admin/* (JWT check)
```

## Flow danych

### Publiczny frontend
```
Użytkownik → Strona główna (Server Component)
           → Sekcje z treścią (obecnie statyczne, docelowo z DB)
           → System rezerwacji (Client Component → mailto:)
```

### Panel admina
```
Admin → /admin/login → POST /api/auth/login
     → JWT w httpOnly cookie
     → middleware.ts weryfikuje JWT na /admin/*
     → Dashboard (Server Component → Prisma → PostgreSQL)
```

### Autentykacja
```
1. Admin wpisuje email + secret code
2. Serwer sprawdza: email w whitelist (tabela Admin) + code == ADMIN_SECRET_CODE
3. Tworzony JWT (jose) + sesja w DB
4. JWT ustawiony w httpOnly cookie (7 dni)
5. Middleware sprawdza JWT na każdym /admin/* request
```
