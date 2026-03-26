# UX, Customer Journey i Dostepnosc — HOMMM

## 1. Persony

### Persona 1: Gosc szukajacy noclegu

| Cecha | Opis |
|-------|------|
| Kim jest | Osoba (25-55 lat) szukajaca krotkoterminowego noclegu w cichym, naturalnym otoczeniu |
| Cel | Szybko sprawdzic dostepnosc, zobaczyc obiekt, zarezerwowac pobyt |
| Urzadzenie | Smartfon (60-70%) lub laptop |
| Kontekst | Przegladarka, link od znajomego, Google, social media |
| Frustracje | Brak jasnej ceny, skomplikowany formularz, wolna strona, brak potwierdzenia |
| Oczekiwania | Piekne zdjecia, prosta rezerwacja, szybka odpowiedz |

### Persona 2: Admin (wlasciciel obiektu)

| Cecha | Opis |
|-------|------|
| Kim jest | Wlasciciel/zarzadca HOMMM, osoba nietechniczna |
| Cel | Zarzadzac rezerwacjami, aktualizowac tresc strony, kontrolowac dostepnosc |
| Urzadzenie | Laptop lub tablet |
| Frustracje | Reczne odpowiadanie na maile, brak widoku kalendarza, brak statystyk |
| Oczekiwania | Prosty panel, szybki podglad rezerwacji, edycja tresci bez programisty |

---

## 2. Customer Journey Map — Gosc

### Faza 1: Odkrycie

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Google, social media (Instagram/TikTok/Facebook), polecenie |
| Strona | Landing page — Hero section |
| Emocja | Ciekawosc, pierwsze wrazenie |
| Akcja goscia | Wchodzi na strone, widzi hero z tlem i logo |
| Cel strony | Przyciagnac uwage, przekazac klimat obiektu |
| **Obecny stan** | Hero dziala dobrze wizualnie; brak OG image (podglad w social media pusty) |
| **Do poprawy** | Dodac OG image i meta description (Faza 5) |

### Faza 2: Eksploracja

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Sekcje "Koncept HOMMM" i "Miejsce" |
| Strona | Sekcja 2 (sec2) i Sekcja 3 (sec3) |
| Emocja | Zainteresowanie, budowanie zaufania |
| Akcja goscia | Czyta o obiekcie, ogladal zdjecia w galerii, scrolluje |
| Cel strony | Przekonac do pobytu — klimat, lokalizacja, unikalosc |
| **Obecny stan** | Sekcje z "Czytaj wiecej" i galeria dzialaja; tresc tylko PL |
| **Do poprawy** | Tlumaczenie ENG (Faza 2), alt text na zdjecia galerii |

### Faza 3: Decyzja

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Formularz rezerwacji (widok "rezerwuj") |
| Strona | Hero section w trybie rezerwacji |
| Emocja | Gotowsc do rezerwacji, potrzeba jasnosci (cena, daty) |
| Akcja goscia | Wybiera daty, liczbe gosci, widzi cene |
| Cel strony | Jasna cena, proste zatwierdzenie, widoczna dostepnosc |
| **Obecny stan** | DatePicker dziala; cena 204.5 PLN/noc hardcoded; brak widocznosci zajetych dat |
| **Do poprawy** | Wyswietlanie zajetych terminow w kalendarzu (Faza 3), cena z DB (Faza 6) |

### Faza 4: Rezerwacja

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Wyslanie rezerwacji |
| Strona | Formularz → potwierdzenie |
| Emocja | Oczekiwanie na potwierdzenie, niepewnosc |
| Akcja goscia | Klika "Rezerwuj", czeka na odpowiedz |
| Cel strony | Natychmiastowe potwierdzenie wyslania, jasny nastepny krok |
| **Obecny stan** | **KRYTYCZNY PROBLEM** — mailto: otwiera klienta email zamiast wyslac formularz; brak potwierdzenia na stronie |
| **Do poprawy** | Backend rezerwacji z emailem potwierdzenia (Faza 3) |

### Faza 5: Potwierdzenie

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Email od systemu |
| Kanal | Email (Resend) |
| Emocja | Ulga, pewnosc |
| Akcja goscia | Otrzymuje email "Otrzymalismy Twoja rezerwacje" |
| Cel | Potwierdzic odbiór, podac szczegoly, podac kontakt |
| **Obecny stan** | Brak — mailto: nie generuje automatycznego potwierdzenia |
| **Do poprawy** | Szablony email (Faza 3) |

### Faza 6: Zatwierdzenie przez admina

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Email od systemu do goscia |
| Kanal | Email (Resend) |
| Emocja | Radosc (zatwierdzenie) lub rozczarowanie (odmowa) |
| Akcja goscia | Otrzymuje email "Rezerwacja potwierdzona" |
| **Obecny stan** | Brak |
| **Do poprawy** | Panel admina + email zatwierdzenia (Faza 3) |

### Faza 7: Pobyt

| Element | Szczegoly |
|---------|-----------|
| Punkt kontaktu | Fizyczny obiekt |
| Emocja | Doswiadczenie pobytu |
| **Poza zakresem strony** | Informacje kontaktowe i dojazd powinny byc widoczne na stronie |

---

## 3. Punkty tarcia (Pain Points)

### Krytyczne (blokujace konwersje)

| # | Problem | Wplyw | Rozwiazanie | Faza |
|---|---------|-------|-------------|------|
| 1 | Rezerwacja przez mailto: | Gosc musi miec skonfigurowanego klienta email; na mobile czesto nie dziala | Backend z formularzem POST + email | Faza 3 |
| 2 | Brak potwierdzenia rezerwacji | Gosc nie wie czy rezerwacja dotarla | Email automatyczny po wyslaniu | Faza 3 |
| 3 | Brak widoku zajetych dat | Gosc moze probowac rezerwowac zajety termin | Kalendarz z blokada zajetych dat | Faza 3 |

### Wazne (obnizajace jakosc UX)

| # | Problem | Wplyw | Rozwiazanie | Faza |
|---|---------|-------|-------------|------|
| 4 | Brak wersji angielskiej | Obcojezyczni goscie nie moga korzystac | System i18n PL/ENG | Faza 2 |
| 5 | Cena hardcoded (204.5 PLN) | Admin nie moze zmienic ceny bez programisty | Cena z DB, edycja w panelu | Faza 6 |
| 6 | Brak meta / OG image | Zly podglad w social media i Google | SEO management | Faza 5 |
| 7 | Brak stanu po wyslaniu | Po kliknieciu "Rezerwuj" brak feedbacku na stronie | Ekran potwierdzenia / toast | Faza 3 |

### Drobne (do poprawy iteracyjnie)

| # | Problem | Rozwiazanie | Faza |
|---|---------|-------------|------|
| 8 | Placeholder dat "--.--.----" | Czytelniejszy placeholder "Wybierz date" | Faza 3 |
| 9 | Footer jako `<section>` zamiast `<footer>` | Poprawic semantyczny HTML | Faza 1 |
| 10 | Brak skip-to-content | Dodac link skip-to-content | Faza 1 |

---

## 4. Audyt dostepnosci (WCAG 2.1 AA)

### Wyniki przegladu

| Kategoria | Status | Szczegoly |
|-----------|--------|-----------|
| **Semantyczny HTML** | Czesciowy | Uzyto `<section>`, ale brak `<main>`, `<footer>`, `<header>` jako landmark; sekcje bez `aria-label` |
| **Atrybut lang** | OK | `<html lang="pl">` ustawione poprawnie |
| **Alt text na obrazach** | Do poprawy | Logo hero ma `alt=""` (powinno byc opisowe lub `role="img"` z aria-label); galeria ma alt text |
| **Nawigacja klawiatura** | Czesciowy | Menu hamburger ma aria-label; Escape zamyka menu; brak widocznego focus ring na niektorych elementach |
| **Focus management** | Do poprawy | Brak trap focus w rozwinietych sekcjach; brak powrotu focus po zamknieciu |
| **Kontrast kolorow** | Do weryfikacji | `rgba(27,27,27,0.78)` na bialym tle — wymaga pomiaru; footer tekst na ciemnym tle — sprawdzic |
| **Skip-to-content** | Brak | Brak linka pomijajacego nawigacje |
| **ARIA roles** | Do poprawy | Brak landmark roles na glownych sekcjach |
| **DatePicker** | Do weryfikacji | react-datepicker — sprawdzic keyboard navigation i aria-labels |
| **Responsywnosc** | OK | Breakpointy 768px/600px; hamburger menu na mobile |

### Lista poprawek do wdrozenia

#### Faza 1 (fundament)

1. Dodac `<main>` wokol glownej tresci
2. Zamienic footer `<section>` na `<footer>`
3. Dodac `<header>` na TopMenu
4. Dodac `aria-label` na kazda `<section>` (np. `aria-label="O koncepcie HOMMM"`)
5. Dodac skip-to-content link na poczatku strony
6. Poprawic `alt` na logo hero: `alt="HOMMM"` lub `alt="HOMMM - wynajem apartamentu"`
7. Dodac focus-visible style na wszystkich interaktywnych elementach
8. Dynamicznie zmieniac `lang` na `<html>` przy przelaczaniu PL/ENG

#### Faza 2 (CMS + i18n)

9. Zapewnic alt text PL/ENG na wszystkich obrazach z galerii (z DB)

#### Faza 3 (rezerwacje)

10. Sprawdzic i poprawic dostepnosc DatePicker (aria-labels, keyboard nav)
11. Dodac aria-live region na potwierdzenie rezerwacji
12. Zapewnic jasne komunikaty bledow w formularzu (aria-describedby)

#### Ciagle

13. Audyt kontrastu kolorow (narzedzie: Lighthouse, axe DevTools)
14. Testy z czytnikiem ekranow (NVDA/VoiceOver) przed Faza 7
