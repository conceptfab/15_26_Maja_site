## 1) Język i styl pracy

- Komunikuj się po polsku.
- Pisz zwięźle i precyzyjnie (bez długich wstępów).
- Gdy zmiana dotyka >2 plików lub niesie ryzyko regresji: najpierw plan w max 5 punktach, potem implementacja.
- Jeśli brakuje kluczowych danych (ścieżki, API, wymagania): zadaj maks. 3 pytania doprecyzowujące i wstrzymaj implementację.

## 2) Standardy zmian w kodzie

- Minimalizuj zakres: nie rób „przy okazji” refaktorów bez uzasadnienia.
- Zachowuj kompatybilność wstecz, chyba że jawnie poproszono o breaking change.
- Preferuj małe, czytelne kroki i jasne nazwy.
- Nie dodawaj zależności bez powodu; jeśli dodajesz, uzasadnij i upewnij się, że jest używana.
- Nie wprowadzaj sekretów/kluczy do repo (żadnych tokenów, haseł, URL-i z kredencjałami).
- Jeśli dotykasz UI: dbaj o stany (loading/empty/error) tam gdzie ma to sens.
- Jeśli dotykasz logiki: dodaj/aktualizuj testy lub chociaż opisz scenariusze manualne (gdy testów brak).

## 3) Anti-Overengineering & KISS

- **KISS (Keep It Simple, Stupid)**: Kod musi być prosty i zrozumiały. Unikaj zbędnej złożoności.
- **YAGNI (You Aren't Gonna Need It)**: Nie dodawaj funkcjonalności "na przyszłość".
- **Minimalizm**: Najpierw minimalny działający kod (MVP), potem refaktoryzuj tylko jeśli to konieczne.
- **Unikaj nadmiarowych abstrakcji**: Nie twórz zbędnych klas, interfejsów czy warstw "na zapas".
- **Zasada 100 linii**: Jeśli funkcja przekracza 100 linii – uprość ją lub podziel na mniejsze, logiczne części.

## 4) Uruchamianie, testy i komendy

Używaj `npm` do zarządzania pakietami:

- Instalacja: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test` (jeśli skonfigurowane)
- Lint/format: `npm run lint`

Zasada:

- Przed zakończeniem zadania: uruchom (lub załóż uruchomienie) linta i testy, jeśli są skonfigurowane.
- Gdy nie da się uruchomić komend w środowisku: wypisz dokładnie, co należy uruchomić lokalnie i jakiego wyniku oczekujesz.

## 5) Format odpowiedzi (gdy proponujesz zmiany)

- 1–2 zdania: co zmieniasz i dlaczego.
- Lista plików, które zmieniasz (jeśli >1).
- Kroki testu: jak sprawdzić (manualnie lub testami).
