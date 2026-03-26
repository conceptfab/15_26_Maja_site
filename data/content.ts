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
    intro: "Rozszerzona tresc konceptu widoczna bez opuszczania tej sekcji i bez zmiany rytmu strony.",
    body: [
      "To miejsce buduje spokojny, wyciszony klimat pobytu i prowadzi goscia przez naturalny rytm dnia od porannego swiatla po wieczorne wyhamowanie. Architektura, materialy i otoczenie pracuja razem, dzieki czemu kazdy element przestrzeni jest czytelny, prosty i funkcjonalny, a jednoczesnie pozostaje przytulny oraz naturalny w odbiorze.",
      "W tej sekcji mozna pokazac pelniejszy opis doswiadczenia: jak wyglada poczatek dnia, gdzie znajduje sie strefa relaksu, jak zorganizowane sa miejsca wspolne i prywatne oraz co sprawia, ze pobyt jest komfortowy nawet przy dluzszym wypoczynku. Taki opis pomaga gosciowi szybciej zrozumiec charakter miejsca i wyobrazic sobie pobyt krok po kroku.",
      "Dodatkowa tresc moze obejmowac szczegoly oferty, mozliwe scenariusze pobytu, sezonowe warianty, a takze praktyczne informacje o dostepie i udogodnieniach. Dzieki temu sekcja nie jest jedynie haslem wizerunkowym, tylko konkretnym, uporzadkowanym opisem tego, czego gosc moze realnie oczekiwac na miejscu.",
    ],
    gallery: [
      { src: "/assets/gal_00.webp", alt: "Strefa relaksu i natura" },
      { src: "/assets/gal_01.webp", alt: "Widok glownej przestrzeni" },
      { src: "/assets/gal_02.webp", alt: "Detale miejsca" },
    ],
  },
  sec3: {
    heading: "YOUR SPECIAL PLACE",
    intro: "Rozszerzona tresc miejsca widoczna w tej samej sekcji po kliknieciu, w bardziej zwartym ukladzie.",
    body: [
      "Opis tej czesci powinien jasno pokazywac, jak wyglada przestrzen, jakie sa jej najmocniejsze strony oraz dlaczego pobyt tutaj daje realne poczucie oddechu od codziennosci. Zamiast pojedynczych hasel mozna przedstawic spojną narracje o komforcie, prywatnosci i bliskosci natury, tak aby gosc od razu wiedzial, czego sie spodziewac.",
      "Warto dopisac konkretne informacje o strefach wypoczynku, standardzie apartamentow, elementach wyposazenia oraz o tym, jak zaplanowany jest przeplyw pomiedzy wspolnymi i prywatnymi fragmentami miejsca. Taka forma jest czytelniejsza i pozwala szybciej podjac decyzje, bo pokazuje faktyczne korzysci i praktyczne aspekty pobytu.",
      "Na koncu tej narracji dobrze jest zostawic przestrzen na szczegoly organizacyjne: terminy, zasady rezerwacji, opcje dodatkowe i dalszy kontakt. Dzieki temu uzytkownik przechodzi plynnie od inspiracji do konkretu, bez potrzeby szukania informacji po innych podstronach.",
    ],
    gallery: [
      { src: "/assets/gal_01.webp", alt: "Kadr przestrzeni pobytu" },
      { src: "/assets/gal_00.webp", alt: "Strefa na zewnatrz" },
      { src: "/assets/gal_02.webp", alt: "Ujecie klimatu miejsca" },
    ],
  },
};
