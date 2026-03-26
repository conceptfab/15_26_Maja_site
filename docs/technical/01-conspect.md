# Konspekt pelnej dokumentacji technicznej

## Cel

Ten konspekt definiuje komplet dokumentow, ktore powinny docelowo znalezc sie w `docs/technical/`.

## 1. Architecture

### `architecture/system-overview.md`

- cel systemu i granice odpowiedzialnosci,
- glowni aktorzy: gosc, admin, developer, operator,
- diagram C4 poziom 1 lub uproszczony context diagram,
- zaleznosci zewnetrzne.

### `architecture/component-landscape.md`

- glowny podzial na frontend publiczny, admin, API, actions, warstwe danych,
- odpowiedzialnosc komponentow,
- boundaries i miejsca sprzezenia.

### `architecture/key-flows.md`

- logowanie admina,
- pobieranie tresci strony,
- edycja tresci w CMS,
- pozniej: rezerwacja, upload obrazow, SEO.

### `architecture/information-architecture.md`

- mapa strony,
- relacja `Page -> Section`,
- zasady nawigacji i porzadku informacji,
- link do aktualnego materialu startowego: `docs/information-architecture.md`.

## 2. Application

### `application/public-site.md`

- render publicznej strony,
- sekcje i ich odpowiedzialnosc,
- fallback na dane statyczne,
- ograniczenia obecnej implementacji.

### `application/admin-panel.md`

- struktura panelu,
- shell, nawigacja, ochrona tras,
- lista obecnie zaimplementowanych widokow.

### `application/cms.md`

- model edycji tresci,
- live preview,
- obslugiwane slugi i pola,
- proces dodawania nowej sekcji.

### `application/i18n.md`

- provider, wybieranie jezyka, trwalosc,
- relacja miedzy `messages/*.json` a trescia z DB,
- ograniczenia SSR i dalsze kroki.

## 3. API

### `api/contracts.md`

- tabela endpointow,
- request / response,
- status codes,
- auth requirements,
- contract stability rules.

### `api/error-model.md`

- konwencja bledow,
- komunikaty do UI,
- zasady walidacji wejscia.

### `api/versioning.md`

- czy i jak wersjonujemy API,
- polityka kompatybilnosci wstecznej.

## 4. Data

### `data/domain-model.md`

- opis encji biznesowych,
- relacje i ograniczenia,
- ktore modele sa aktywnie uzywane, a ktore przygotowane pod dalsze etapy.

### `data/schema-reference.md`

- referencja do `prisma/schema.prisma`,
- opis kazdej tabeli / modelu,
- indeksy, unikalnosci, pola krytyczne.

### `data/seed-and-test-data.md`

- co tworzy seed,
- jakie dane sa bezpieczne do local dev,
- jak odtworzyc stan startowy.

## 5. Security

### `security/authentication.md`

- whitelist emaili,
- secret code,
- JWT + `Session`,
- middleware versus `verifySession()`.

### `security/security-controls.md`

- headers,
- env vars i tajemnice,
- walidacja,
- granice odpowiedzialnosci.

### `security/threats-and-risks.md`

- lista glownych ryzyk,
- luki znane na obecnym etapie,
- plan ich domykania.

## 6. Operations

### `operations/local-development.md`

- setup lokalny,
- env vars,
- seed,
- najczestsze problemy.

### `operations/deployment.md`

- target platform,
- build i start,
- release flow,
- rollback.

### `operations/configuration-reference.md`

- wszystkie zmienne srodowiskowe,
- format, wartosci oczekiwane, wrazliwosc danych.

### `operations/backup-and-recovery.md`

- backup bazy i uploadow,
- recovery objective,
- procedura odtworzenia.

### `operations/monitoring-and-alerting.md`

- logi,
- metryki,
- health checks,
- zdarzenia wymagajace reakcji.

### `operations/runbooks/`

- login failure,
- DB unavailable,
- broken content publish,
- future: reservation flow outage.

## 7. Quality

### `quality/testing-strategy.md`

- poziomy testow,
- co jest manualne, co automatyczne,
- kryteria akceptacji dla release.

### `quality/release-checklist.md`

- smoke checks,
- security checks,
- docs checks,
- manual acceptance flow.

## 8. Decisions

### `decisions/README.md`

- indeks ADR-ow,
- status: proposed / accepted / superseded / deprecated.

### Przykladowe przyszle ADR-y

- wybor docelowej bazy: SQLite lokalnie vs PostgreSQL produkcyjnie,
- model i18n: client-side locale vs routing per locale,
- model auth: shared secret vs per-user credential flow,
- model CMS: fixed sections vs dynamic page builder.

## 9. Zalecana kolejnosc uzupelniania

1. `security/authentication.md`
2. `operations/local-development.md`
3. `architecture/system-overview.md`
4. `application/cms.md`
5. `data/schema-reference.md`
6. `api/contracts.md`
7. `operations/deployment.md`
8. `quality/testing-strategy.md`

## 10. Material startowy z istniejacych docs

| Nowy obszar | Obecny material zrodlowy |
|-------------|---------------------------|
| Architecture | `docs/architecture.md`, `docs/information-architecture.md` |
| Application | `docs/content.md`, `docs/i18n.md` |
| Security | `docs/auth.md`, `docs/security.md` |
| Operations | `docs/setup.md` |

Ten konspekt nie zastepuje obecnych plikow, tylko wyznacza docelowa, bardziej profesjonalna strukture pakietu technicznego.
