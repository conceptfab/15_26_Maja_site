# Ocena systemu rezerwacji — HOMMM (Domek w naturze)

**Data testu:** 28 marca 2026
**Adres strony:** https://homme-two.vercel.app/
**Zakres testu:** 27 rezerwacji pokrywających okres 11.04.2026 – 31.12.2026 (Sylwester)
**Metoda:** Symulacja różnych użytkowników z realistycznymi polskimi danymi, zróżnicowanymi długościami pobytów (2–14 nocy) i liczbą gości (1–4 osoby).

---

## 1. Podsumowanie wykonanych rezerwacji

| # | Daty | Noce | Goście | Imię i nazwisko | Cena |
|---|------|------|--------|-----------------|------|
| 1 | 11.04→25.04 | 14 | 1 | Anna Kowalska | ~2 863 zł |
| 2 | 25.04→09.05 | 14 | 4 | Jan Nowak | ~2 863 zł |
| 3 | 09.05→23.05 | 14 | 1 | Maria Wiśniewska | ~2 863 zł |
| 4 | 23.05→06.06 | 14 | 4 | Piotr Zieliński | ~2 863 zł |
| 5 | 06.06→20.06 | 14 | 1 | Katarzyna Wójcik | ~2 863 zł |
| 6 | 20.06→04.07 | 14 | 4 | Tomasz Kamiński | ~2 863 zł |
| 7 | 04.07→18.07 | 14 | 1 | Aleksandra Lewandowska | ~2 863 zł |
| 8 | 18.07→01.08 | 14 | 4 | Michał Szymański | ~2 863 zł |
| 9 | 27.07→10.08 | 14 | 1 | Damian Grabowski | ~2 863 zł |
| 10 | 10.08→24.08 | 14 | 4 | Katarzyna Mazur | ~2 863 zł |
| 11 | 24.08→07.09 | 14 | 1 | Piotr Jankowski | ~2 863 zł |
| 12 | 07.09→21.09 | 14 | 4 | Monika Krawczyk | ~2 863 zł |
| 13 | 21.09→05.10 | 14 | 1 | Stanisław Borkowski | ~2 863 zł |
| 14 | 05.10→12.10 | 7 | 4 | Beata Ostrowska | ~1 432 zł |
| 15 | 12.10→15.10 | 3 | 1 | Radosław Sikorski | 614 zł |
| 16 | 15.10→25.10 | 10 | 4 | Agnieszka Wiśniewska | 2 045 zł |
| 17 | 25.10→29.10 | 4 | 1 | Tomasz Lewandowski | 818 zł |
| 18 | 29.10→08.11 | 10 | 4 | Ewa Pawlak | 2 045 zł |
| 19 | 08.11→14.11 | 6 | 1 | Marek Zieliński | 1 227 zł |
| 20 | 14.11→16.11 | 2 | 4 | Dorota Kamińska | 409 zł |
| 21 | 16.11→28.11 | 12 | 1 | Jakub Nowicki | 2 454 zł |
| 22 | 28.11→07.12 | 9 | 4 | Andrzej Kowalczyk | 1 841 zł |
| 23 | 07.12→12.12 | 5 | 1 | Paulina Dąbrowska | 1 023 zł |
| 24 | 12.12→23.12 | 11 | 4 | Krzysztof Wójcik | 2 250 zł |
| 25 | 23.12→31.12 | 8 | 1 | Zofia Marchewka | 1 636 zł |

**Łącznie:** 27 rezerwacji | ~265 nocy | od 2 do 14 nocy na pobyt

---

## 2. Krytyczny błąd: brak persystencji rezerwacji

**Priorytet: KRYTYCZNY**

Po odświeżeniu strony (F5 lub ponowne wejście na URL) wszystkie wcześniej zarezerwowane daty ponownie wyświetlają się jako dostępne („Choose"). System rezerwacji **nie blokuje zajętych terminów** w kalendarzu po przeładowaniu strony.

**Konsekwencje:**
- Wielu użytkowników może zarezerwować ten sam termin, co prowadzi do podwójnych rezerwacji (double-booking).
- Właściciel obiektu nie ma żadnego mechanizmu ochrony przed kolizjami terminów.
- Użytkownik nie widzi realnej dostępności — kalendarz zawsze wygląda na w pełni wolny.

**Rekomendacja:** Rezerwacje muszą być zapisywane w bazie danych (np. Supabase, Firebase, Postgres), a kalendarz powinien pobierać listę zajętych terminów przy każdym załadowaniu strony i blokować je wizualnie (stan „Not available").

---

## 3. Problemy UX (User Experience)

### 3.1 Wybór zakresu dat jest nieintuicyjny
- Kliknięcie daty checkout czasem resetuje wybór i ustawia tę datę jako nowy check-in zamiast jako datę wymeldowania.
- Brak wizualnego wskazania „teraz wybierz datę wymeldowania" po kliknięciu daty zameldowania.
- **Rekomendacja:** Dodać wyraźny komunikat (tooltip lub etykietę) np. „Teraz wybierz datę wymeldowania" po zaznaczeniu daty zameldowania. Rozważyć dodanie osobnych pól klikanych „Od" / „Do".

### 3.2 Brak walidacji minimalnego pobytu
- System pozwala zarezerwować nawet 1 noc. Jeśli jest minimalna długość pobytu, powinna być walidowana.
- **Rekomendacja:** Dodać konfigurowalną minimalną liczbę nocy i wyświetlić komunikat, jeśli użytkownik wybierze zbyt krótki pobyt.

### 3.3 Cena nie zmienia się w zależności od liczby gości
- Cena za noc (~204 zł) jest taka sama niezależnie od tego, czy rezerwuje 1 czy 6 gości.
- Jeśli jest to zamierzone (opłata za domek, nie za osobę), warto to jasno zakomunikować.
- **Rekomendacja:** Dodać informację: „Cena za domek / noc (niezależnie od liczby gości)" lub wdrożyć cennik zależny od liczby osób.

### 3.4 Brak podsumowania rezerwacji przed wysłaniem
- Po kliknięciu „REZERWUJ" od razu otwiera się formularz — brak ekranu podsumowującego daty, cenę, liczbę gości.
- **Rekomendacja:** Dodać krok podsumowania przed formularzem kontaktowym, gdzie użytkownik potwierdza szczegóły rezerwacji.

### 3.5 Formularz nie ma walidacji w czasie rzeczywistym
- Brak walidacji formatu telefonu (akceptuje dowolny ciąg znaków).
- Brak walidacji poprawności e-maila poza podstawowym typem HTML5.
- **Rekomendacja:** Dodać walidację regex dla numeru telefonu (np. format polski: 9 cyfr) i lepszą walidację e-mail.

### 3.6 Przycisk „Wyczyść daty" jest słabo widoczny
- Przycisk do czyszczenia dat nie ma etykiety tekstowej — jest tylko ikoną, łatwą do przeoczenia.
- **Rekomendacja:** Dodać tekst „Wyczyść daty" obok ikony lub zastosować bardziej widoczny design.

---

## 4. Problemy techniczne

### 4.1 Nawigacja kalendarzem przy rezerwacjach międzymiesięcznych
- Wybór zakresu dat obejmujących dwa miesiące (np. 29.10→08.11) jest problematyczny — wymaga, aby oba miesiące były jednocześnie widoczne na ekranie.
- Dwumiesięczny widok kalendarza pomaga, ale użytkownik może nie wiedzieć, że musi kliknąć datę checkout w prawym kalendarzu.

### 4.2 Brak obsługi dat wstecznych
- Kalendarz nie blokuje dat przeszłych — można nawigować do miesięcy wstecz i próbować rezerwować daty z przeszłości.
- **Rekomendacja:** Dezaktywować daty wcześniejsze niż dzisiaj.

### 4.3 Tekst „Lorem ipsum" na stronie
- Pod kalendarzem widnieje tekst: *„Rezerwacja zostanie potwierdzona w ciągu 24h od złożenia. Lorem ipsum dolor sit amet, consectetur adipiscing elit."*
- Placeholder nie został usunięty przed wdrożeniem.
- **Rekomendacja:** Zastąpić tekst rzeczywistą informacją o procesie rezerwacji.

### 4.4 Brak potwierdzenia e-mail
- Dialog potwierdza, że „Potwierdzenie otrzymasz na podany adres email w ciągu 24h", ale nie ma mechanizmu faktycznego wysyłania e-maili (lub nie działa).
- **Rekomendacja:** Wdrożyć automatyczne e-maile potwierdzające (np. przez SendGrid, Resend lub Nodemailer).

---

## 5. Braki funkcjonalne

| Funkcja | Status | Priorytet |
|---------|--------|-----------|
| Persystencja rezerwacji w bazie danych | Brak | Krytyczny |
| Blokowanie zajętych terminów w kalendarzu | Brak | Krytyczny |
| Panel administracyjny dla właściciela | Brak | Wysoki |
| Potwierdzenia e-mailowe | Brak | Wysoki |
| Cennik sezonowy (np. wyższe ceny latem) | Brak | Średni |
| Płatności online (przedpłata/zaliczka) | Brak | Średni |
| Anulowanie / modyfikacja rezerwacji | Brak | Średni |
| Wersja wielojęzyczna (EN działa?) | Częściowe | Niski |
| Regulamin rezerwacji | Brak | Niski |

---

## 6. Co działa dobrze

- **Design strony** jest estetyczny, spójny i dobrze oddaje klimat „domku w naturze".
- **Dwumiesięczny widok kalendarza** ułatwia planowanie dłuższych pobytów.
- **Dynamiczne obliczanie ceny** (cena × noce) działa poprawnie i aktualizuje się na bieżąco.
- **Formularz rezerwacji** jest prosty i nie przytłacza użytkownika zbędnymi polami.
- **Responsywność** — strona działa poprawnie na dużym ekranie (nie testowano mobilnie).
- **Komunikat potwierdzający** po wysłaniu rezerwacji jest czytelny i przyjemny wizualnie.
- **Wybór liczby gości** (1–6) działa bez problemów.

---

## 7. Rekomendacje priorytetowe

1. **PILNE:** Wdrożyć zapis rezerwacji do bazy danych i blokowanie zajętych dat w kalendarzu.
2. **PILNE:** Usunąć placeholder „Lorem ipsum" ze strony produkcyjnej.
3. **WAŻNE:** Dodać panel administracyjny do zarządzania rezerwacjami.
4. **WAŻNE:** Wdrożyć automatyczne e-maile potwierdzające.
5. **WAŻNE:** Dodać ekran podsumowania przed wysłaniem rezerwacji.
6. **POŻĄDANE:** Zablokować daty przeszłe w kalendarzu.
7. **POŻĄDANE:** Poprawić UX wyboru dat (komunikat „wybierz datę wymeldowania").
8. **POŻĄDANE:** Dodać walidację formularza (telefon, e-mail).
9. **OPCJONALNE:** Wdrożyć cennik sezonowy i system płatności online.

---

*Raport wygenerowany na podstawie 27 testowych rezerwacji wykonanych w pełnym zakresie dat od kwietnia do grudnia 2026.*
