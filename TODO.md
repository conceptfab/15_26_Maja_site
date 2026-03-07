Kod działa poprawnie, ale przeanalizuj kod projektu pod katem poprawności logiki, wydajności, możliwych optymalizacji, nadmiarowego kodu i sugerowanych rozwiązań. Swoje uwagi i propozycje zapisz w szczegółowym raport.md

- wszystkie nagłowki poza H1-brand - maja miec ten sam styl
- dziura w ramkce rezerwacji

Chce dodac backend do zarządzania treścią tej witryny:

- Globalna logika strony - sekcje i menu
- Ustawienia dla każdej sekcji - treści oparta o JSON i tagi, możliwość zmiany tła, edycja galerii - wszystkie teksty w wersji PL/ENG - jeśli można zostosowac gotowy framework - to warto to zrobić. Strona będzie hostowana na Vercel/Railway jeśli się da warto zintegrować statystyki z tych serwisów.
- Zarządzanie SEO i gogle analitycs,
- Automatyczna optymalizacja plików graficznych do widoków - wynikowo warianty webp
- System rezerwacji - mail do użytkownika i admina z informacją o chęci rezerwacji. W panelu admina tworzenie listy rezerwacji z danymi użytkowników - po zatwierdzeniu przez admina rezerwacji lub opłacenia pobytu w kalendarzu dany termin nie może być dostępnyy dla innych
- Trzeba dodac do formularze rezerwacji możliwości dodania komentarza
- Logowanie admina na secret kod, biała lista adminów - maile poza biała listą są ignorowane
- system statystyk dla danych dotyczących rezerwacji/wynajmu

Cały panel administracyjny ma wyglądać jak profesjonalny dashboard administracyjny

Propozycja animacji

1. Scroll-reveal na treściach sekcji

Tekst, nagłówki i przyciski w sekcjach story (sec2, sec3) wjeżdżają z dołu z delikatnym fade-in gdy
użytkownik scrolluje do nich. Staggered delay — nagłówek pierwszy, tekst sekundę później, przycisk na
końcu. Największy wpływ na UX — strona przestaje być "płaska".

2. Staggered reveal w expanded content

Po kliknięciu "CZYTAJ WIĘCEJ" — tekst pojawia się kolumna po kolumnie, a zdjęcia w galerii wchodzą z
cascade delay (jedno po drugim, np. 80ms odstępu). Daje poczucie "rozwijania się" treści.

3. Animowane wejście sekcji rezerwacji

Przejście z hero-logo do widoku rezerwacji: promo text, galeria i kalendarz wchodzą z fadeIn +  
 translateY, każdy blok z drobnym opóźnieniem. Karta podsumowania wjeżdża ostatnia.

4. Parallax na tłach sekcji

Subtelny parallax (2-4%) na background-image sekcji hero, sec2, sec3. Tło porusza się wolniej niż  
 content — dodaje głębi bez rozpraszania.

5. Hover na obrazach galerii

Delikatny scale(1.03) + lekkie zwiększenie jasności na hover zdjęć w galerii (expanded content +  
 reservation). Sygnalizuje interaktywność.

6. Footer slide-up

Elementy footera (kolumny) wjeżdżają od dołu z fade-in gdy sekcja wchodzi w viewport. Staggered —  
 kontakt, logo, dane korporacyjne.

7. Smooth state transitions

Zamiast skokowej zmiany między story a expanded content — cross-fade (stara treść znika, nowa pojawia
się płynnie).

---

Priorytet implementacji: 1 → 2 → 3 → 5 → 4 → 6 → 7 (od największego wpływu na UX do najmniejszego).

Chcesz żebym to wdrożył? Mogę zaimplementować wszystkie na raz albo wybraną grupę.
