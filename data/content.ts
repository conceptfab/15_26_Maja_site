export type ExpandableSection = "sec2" | "sec3";

export const EXPANDED_SECTION_CONTENT: Record<
  ExpandableSection,
  {
    heading: string;
    intro: string;
    body: string[];
    gallery: Array<{ src: string; alt: string }>;
  }
> = {
  sec2: {
    heading: "KONCEPT HOMMM",
    intro: "Rozszerzona treść konceptu widoczna bez opuszczania tej sekcji i bez zmiany rytmu strony.",
    body: [
      "To miejsce buduje spokojny, wyciszony klimat pobytu i prowadzi gościa przez naturalny rytm dnia od porannego światła po wieczorne wyhamowanie. Architektura, materiały i otoczenie pracują razem, dzięki czemu każdy element przestrzeni jest czytelny, prosty i funkcjonalny, a jednocześnie pozostaje przytulny oraz naturalny w odbiorze.",
      "W tej sekcji można pokazać pełniejszy opis doświadczenia: jak wygląda początek dnia, gdzie znajduje się strefa relaksu, jak zorganizowane są miejsca wspólne i prywatne oraz co sprawia, że pobyt jest komfortowy nawet przy dłuższym wypoczynku. Taki opis pomaga gościowi szybciej zrozumieć charakter miejsca i wyobrazić sobie pobyt krok po kroku.",
      "Dodatkowa treść może obejmować szczegóły oferty, możliwe scenariusze pobytu, sezonowe warianty, a także praktyczne informacje o dostępie i udogodnieniach. Dzięki temu sekcja nie jest jedynie hasłem wizerunkowym, tylko konkretnym, uporządkowanym opisem tego, czego gość może realnie oczekiwać na miejscu.",
    ],
    gallery: [
      { src: "/assets/gal_00.webp", alt: "Strefa relaksu i natura" },
      { src: "/assets/gal_01.webp", alt: "Widok głównej przestrzeni" },
      { src: "/assets/gal_02.webp", alt: "Detale miejsca" },
    ],
  },
  sec3: {
    heading: "YOUR SPECIAL PLACE",
    intro: "Rozszerzona treść miejsca widoczna w tej samej sekcji po kliknięciu, w bardziej zwartym układzie.",
    body: [
      "Opis tej części powinien jasno pokazywać, jak wygląda przestrzeń, jakie są jej najmocniejsze strony oraz dlaczego pobyt tutaj daje realne poczucie oddechu od codzienności. Zamiast pojedynczych haseł można przedstawić spójną narrację o komforcie, prywatności i bliskości natury, tak aby gość od razu wiedział, czego się spodziewać.",
      "Warto dopisać konkretne informacje o strefach wypoczynku, standardzie apartamentów, elementach wyposażenia oraz o tym, jak zaplanowany jest przepływ pomiędzy wspólnymi i prywatnymi fragmentami miejsca. Taka forma jest czytelniejsza i pozwala szybciej podjąć decyzję, bo pokazuje faktyczne korzyści i praktyczne aspekty pobytu.",
      "Na końcu tej narracji dobrze jest zostawić przestrzeń na szczegóły organizacyjne: terminy, zasady rezerwacji, opcje dodatkowe i dalszy kontakt. Dzięki temu użytkownik przechodzi płynnie od inspiracji do konkretu, bez potrzeby szukania informacji po innych podstronach.",
    ],
    gallery: [
      { src: "/assets/gal_01.webp", alt: "Kadr przestrzeni pobytu" },
      { src: "/assets/gal_00.webp", alt: "Strefa na zewnątrz" },
      { src: "/assets/gal_02.webp", alt: "Ujęcie klimatu miejsca" },
    ],
  },
};
