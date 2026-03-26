# Dokumentacja techniczna - HOMMM

## Cel

Ten katalog jest docelowym miejscem dla kompletnej dokumentacji technicznej projektu. Ma spelniac trzy role:

- byc zrodlem prawdy dla zespolu developerskiego,
- ulatwiac onboarding nowej osoby technicznej,
- stanowic pakiet przekazania dla utrzymania, audytu i dalszego rozwoju.

## Dla kogo jest ten pakiet

| Odbiorca | Czego tu szuka |
|----------|----------------|
| Developer | architektury, przeplywow danych, kontraktow i standardow zmian |
| Maintainer / operator | deploymentu, konfiguracji, runbookow i odzyskiwania po awarii |
| Security reviewer | modelu auth, granic zaufania, ryzyk i zabezpieczen |
| PM / wlasciciel techniczny | zakresu systemu, zaleznosci i listy decyzji architektonicznych |
| Zewnetrzny wykonawca | szybkiego wejscia w projekt bez wiedzy ustnej |

## Struktura katalogu

```text
docs/technical/
  README.md
  00-governance.md
  01-conspect.md
  architecture/
  application/
  api/
  data/
  security/
  operations/
  quality/
  decisions/
  templates/
```

## Zasada organizacyjna

Istniejace pliki w `docs/` pozostaja aktualna dokumentacja robocza dla zrealizowanych etapow. `docs/technical/` jest warstwa docelowa:

- bardziej uporzadkowana,
- gotowa do rozbudowy wraz z kolejnymi fazami,
- podzielona wedlug odpowiedzialnosci technicznych, a nie tylko etapow projektu.

## Mapowanie obecnych plikow do nowej struktury

| Obecny plik | Docelowe miejsce w `docs/technical/` |
|-------------|--------------------------------------|
| `docs/architecture.md` | `architecture/` + `application/` |
| `docs/setup.md` | `operations/` |
| `docs/auth.md` | `security/` |
| `docs/security.md` | `security/` + `operations/` |
| `docs/content.md` | `application/` |
| `docs/i18n.md` | `application/` |
| `docs/information-architecture.md` | `architecture/` |
| `docs/ux-customer-journey.md` | material wspierajacy, poza glownym pakietem technical docs |

## Minimalny standard kazdego dokumentu

Kazdy dokument techniczny w tym katalogu powinien miec:

1. cel i zakres,
2. status dokumentu: `draft`, `active` albo `deprecated`,
3. wlasciciela lub odpowiedzialny obszar,
4. date ostatniego przegladu,
5. odniesienia do kodu lub innych dokumentow,
6. jasne rozroznienie miedzy stanem obecnym a planowanym.

## Priorytet uzupelniania

Kolejnosc uzupelniania tego pakietu powinna byc taka:

1. `architecture/`
2. `security/`
3. `operations/`
4. `application/`
5. `api/`
6. `data/`
7. `quality/`
8. `decisions/`

## Dobre praktyki utrzymania

- Dokumentacja jest versioned razem z kodem.
- Zmiana zachowania systemu powinna obejmowac takze update odpowiednich docs.
- Diagramy i przyklady musza byc utrzymywane blisko kodu i nie moga przeczyc implementacji.
- Gdy cos jest planowane, ale niezaimplementowane, musi byc oznaczone jako `planned`.
- ADR-y zapisujemy tylko dla decyzji, ktore maja realny koszt zmiany lub istotny trade-off.
