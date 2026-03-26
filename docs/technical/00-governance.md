# Standard utrzymania dokumentacji technicznej

## Cel

Ten dokument definiuje minimalne zasady tworzenia i utrzymywania dokumentacji technicznej w projekcie HOMMM.

## Status dokumentu

- Status: `active`
- Scope: `docs/technical/*`

## Zasady bazowe

### 1. Docs-as-code

- Dokumentacja techniczna jest trzymana w repo.
- Zmiany dokumentacji przechodza przez ten sam proces przegladu co kod.
- Nie utrzymujemy krytycznej wiedzy tylko w komunikatorze albo ustnie.

### 2. Jedno zrodlo prawdy

- Ten sam temat powinien miec jeden dokument glowny.
- Inne dokumenty linkuja do zrodla, zamiast dublowac tresc.
- Jesli duplikacja jest potrzebna, musi byc swiadoma i ograniczona do krotkiego podsumowania.

### 3. Stan obecny kontra planowany

Kazdy dokument musi rozrozniac:

- `current state` - to, co faktycznie dziala w kodzie,
- `planned state` - to, co wynika z roadmapy albo planu wdrozen.

Nie wolno opisywac planu jako stanu wdrozonego.

## Konwencja dokumentu

Rekomendowany naglowek:

```md
# Nazwa dokumentu

## Meta

- Status: active
- Owner: engineering
- Last reviewed: YYYY-MM-DD
- Scope: ...
- Related code: ...
```

Jesli dokument jest bardzo krotki, meta moze zostac skompresowana do jednej sekcji.

## Nazewnictwo i podzial

- Foldery odzwierciedlaja obszary odpowiedzialnosci: `architecture`, `security`, `operations` itd.
- Nazwy plikow powinny byc stabilne i opisowe.
- Dokumenty indeksowe w folderach trzymamy jako `README.md`.
- Szablony trzymamy tylko w `templates/`.

## Kiedy aktualizowac dokumentacje

Dokumentacja musi byc zaktualizowana przy zmianie:

- przeplywu danych,
- modelu danych,
- endpointow lub kontraktow,
- sposobu logowania i autoryzacji,
- konfiguracji srodowiska,
- procedur deploymentu i odzyskiwania,
- krytycznych zalozen architektonicznych.

## Review cadence

| Obszar | Minimalna czestotliwosc przegladu |
|--------|-----------------------------------|
| Architecture | raz na wieksza zmiane architektury |
| Security | przed release i po zmianie auth / API |
| Operations | po kazdej zmianie deploymentu lub konfiguracji |
| Runbooki | po kazdym incydencie lub cwiczeniu |
| ADR | tylko przy nowej decyzji lub zmianie statusu decyzji |

## Definition of done dla dokumentacji

Dokument jest gotowy, gdy:

1. opisuje realny stan lub jest jasno oznaczony jako plan,
2. ma wlasciciela i scope,
3. odsyla do konkretnych plikow kodu lub katalogow,
4. zawiera najwazniejsze scenariusze operacyjne, jesli dotyczy runtime,
5. nie wymaga ustnego dopowiadania, aby zrozumiec podstawowy obraz systemu.

## Antywzorce

- dokument "encyklopedia", ktorego nikt nie aktualizuje,
- mieszanie instrukcji dla admina nietechnicznego z dokumentacja techniczna,
- kopiowanie kodu zamiast referencji do plikow,
- brak daty i brak informacji, czy dokument nadal obowiazuje,
- opisywanie zyczeniowej architektury zamiast tego, co stoi w repo.
