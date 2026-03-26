# Architektura HOMMM

## Zakres

Ten opis dotyczy stanu repo po realizacji Faz 0-2. Projekt ma juz:

- publiczna strone oparta o tresc z bazy z fallbackiem na dane statyczne,
- panel admina z logowaniem i edycja tresci,
- prosty system i18n po stronie klienta.

Wiele modeli i linkow przygotowuje kolejne fazy, ale nie wszystkie zapowiedziane funkcje sa juz aktywne.

## Stack technologiczny

| Warstwa | Aktualna technologia |
|---------|----------------------|
| Framework | Next.js 15 App Router |
| UI publiczna | React 19 + CSS w `app/globals.css` |
| UI admina | Tailwind CSS 4 + shadcn/ui |
| ORM | Prisma 7 |
| Lokalna baza | SQLite (`dev.db`) przez `@prisma/adapter-better-sqlite3` |
| Auth | `jose` + cookie httpOnly + tabela `Session` |
| Walidacja | Zod |
| i18n | Custom `I18nProvider` + `messages/*.json` + `localStorage` |

## Najwazniejsza roznica wzgledem planu dlugoterminowego

Docelowy plan zaklada PostgreSQL na Railway. Aktualna implementacja developerska i runtime w repo sa oparte o SQLite. Dokumentacja techniczna powinna wiec rozrozniac:

- aktualny stan wdrozony w kodzie,
- przyszly kierunek infrastrukturalny zapisany w `plan_implementacji.md`.

## Glowne warstwy systemu

### 1. Publiczny frontend

Najwazniejsze pliki:

- `app/page.tsx`
- `components/HomeClient.tsx`
- `components/TopMenu.tsx`
- `lib/content.ts`
- `data/content.ts`

Charakterystyka:

- strona publiczna jest jedna i renderowana z `app/page.tsx`,
- dane sekcji sa pobierane z bazy przez `getHomeContent()`,
- gdy zapytanie do DB sie nie powiedzie albo DB jest pusta, kod wraca do fallbacku z `lib/content.ts` i `data/content.ts`,
- warstwa publiczna nie renderuje jeszcze dynamicznie dowolnych sekcji - zna z gory zestaw slugow.

### 2. Panel admina

Najwazniejsze pliki:

- `app/admin/layout.tsx`
- `components/admin/AdminShell.tsx`
- `app/admin/login/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/admin/content/page.tsx`
- `app/admin/content/[slug]/page.tsx`
- `app/admin/content/[slug]/SectionEditor.tsx`

Charakterystyka:

- admin ma osobny layout z dark theme,
- shell laduje sidebar na desktopie i `Sheet` na mobile,
- realnie zaimplementowany zakres panelu to logowanie, dashboard i edycja tresci,
- linki do galerii, rezerwacji, kalendarza, SEO i ustawien sa przygotowane pod dalsze fazy.

### 3. API i akcje serwerowe

Najwazniejsze pliki:

- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/content/sections/route.ts`
- `actions/content.ts`

Rozdzial odpowiedzialnosci:

- route handlers obsluguja logowanie i lekkie endpointy pomocnicze,
- mutacje CMS sa realizowane przez server actions,
- lista sekcji do sidebara admina jest pobierana osobnym endpointem `GET /api/content/sections`.

### 4. Warstwa danych

Najwazniejsze pliki:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/db.ts`
- `lib/generated/prisma/*`

Charakterystyka:

- schemat zawiera juz modele przygotowane pod dalsze fazy,
- obecnie aktywnie uzywane sa glownie `Admin`, `Session`, `Page`, `Section` i czesciowo `SiteSettings`,
- modele rezerwacji, galerii i SEO sa juz obecne, ale obsluga biznesowa pozostaje na dalsze etapy.

## Przeplyw danych

### Publiczna strona

```text
request GET /
  -> app/page.tsx
  -> lib/content.getHomeContent()
       -> Prisma: pobierz sekcje strony home
       -> fallback: dane statyczne, gdy DB nie odpowie lub jest pusta
  -> components/HomeClient.tsx
       -> wybor tresci PL/EN na podstawie i18n z klienta
       -> render sekcji i interakcji strony
```

### Logowanie admina

```text
/admin/login
  -> POST /api/auth/login
       -> Zod waliduje payload
       -> sprawdzenie emaila admina i wspolnego kodu
       -> lib/auth.createSession()
            -> czyszczenie wygaslych sesji
            -> podpis JWT
            -> zapis sesji w DB
            -> ustawienie cookie httpOnly
  -> redirect na /admin/dashboard
```

### Edycja tresci

```text
/admin/content/[slug]
  -> actions/content.getContentBySlug()
  -> SectionEditor
       -> lokalny stan formularza PL/EN
       -> live preview przez iframe + postMessage
       -> actions/content.updateContent()
            -> verifySession()
            -> prisma.section.update()
       -> router.refresh()
```

## Struktura katalogow

```text
app/
  layout.tsx
  page.tsx
  admin/
  api/

actions/
  content.ts

components/
  HomeClient.tsx
  TopMenu.tsx
  ClientProviders.tsx
  admin/
  ui/

lib/
  auth.ts
  content.ts
  db.ts
  env.ts
  i18n.ts
  json-utils.ts
  validations.ts
  generated/prisma/

prisma/
  schema.prisma
  seed.ts

messages/
  pl.json
  en.json
```

## Kluczowe decyzje architektoniczne

| Decyzja | Skutek |
|---------|--------|
| One-page publiczna | Prosta IA i szybki flow do rezerwacji |
| CMS oparty o `Section.contentPl/contentEn` | Elastyczne pola tekstowe bez rozbudowywania schematu przy kazdej zmianie copy |
| Fallback na dane statyczne | Strona nie przestaje dzialac, gdy lokalna DB jest pusta albo niedostepna |
| i18n po stronie klienta | Szybkie wdrozenie PL/EN, ale bez pelnego SSR per locale |
| Server actions dla CMS | Mniej boilerplate niz osobne endpointy CRUD |
| Middleware + weryfikacja sesji w actionach | Lekki guard na krawedzi i pelniejsza kontrola przy mutacjach |

## Ograniczenia obecnego stanu

| Obszar | Ograniczenie |
|--------|--------------|
| CMS | Nie dodaje jeszcze nowych typow sekcji bez zmian w frontendzie |
| i18n | Jezyk nie jest trzymany w URL ani cookie; pierwsze HTML zawsze startuje z `lang=\"pl\"` |
| Auth | Middleware nie sprawdza sesji w DB, tylko podpis i wygasniecie JWT |
| Rezerwacje | Warstwa danych istnieje, ale publiczny flow nadal konczy sie na `mailto:` |
| Admin shell | Zawiera linki do widokow z kolejnych faz, ktore nie sa jeszcze obecne |

## Wnioski

Po Fazach 0-2 architektura jest juz uzywalna i spojna: publiczny frontend korzysta z CMS, admin ma bezpieczny punkt wejscia, a tresc i jezyk sa edytowalne. Jednoczesnie repo nadal zawiera elementy "na wyrost" pod dalsze etapy, wiec dokumentacja powinna stale odrozniac stan zaimplementowany od przygotowanego, ale jeszcze nieuzywanego.
