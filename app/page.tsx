"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { pl } from "date-fns/locale";
import DatePicker from "react-datepicker";
import { TopMenu, type MenuColors, type MenuView } from "../components/TopMenu";

type ExpandableSection = "sec2" | "sec3";
const PRICE_PER_NIGHT = 204.5;

const getNightLabel = (nights: number) => {
  if (nights === 1) {
    return "noc";
  }

  const mod10 = nights % 10;
  const mod100 = nights % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return "noce";
  }

  return "nocy";
};

const EXPANDED_SECTION_CONTENT: Record<
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
      { src: "/assets/sec_2.jpg", alt: "Strefa relaksu i natura" },
      { src: "/assets/hero.jpg", alt: "Widok glownej przestrzeni" },
      { src: "/assets/sec_3.jpg", alt: "Detale miejsca" },
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
      { src: "/assets/sec_3.jpg", alt: "Kadr przestrzeni pobytu" },
      { src: "/assets/sec_2.jpg", alt: "Strefa na zewnatrz" },
      { src: "/assets/hero.jpg", alt: "Ujecie klimatu miejsca" },
    ],
  },
};

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>("home");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandableSection | null>(null);
  const [reservationRange, setReservationRange] = useState<[Date | null, Date | null]>([
    new Date(2026, 0, 30),
    new Date(2026, 1, 1),
  ]);
  const [reservationGuests, setReservationGuests] = useState("1");
  const isMenuContentVisible = activeView === "rezerwuj";
  const isExpandedContentVisible = expandedSection !== null;
  const isRedMenuMode = isMenuContentVisible || isExpandedContentVisible;
  const lastScrollYRef = useRef(0);
  const [checkIn, checkOut] = reservationRange;
  const nights = checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0;
  const totalPrice = Math.round(nights * PRICE_PER_NIGHT);
  const checkInLabel = checkIn ? format(checkIn, "d.MM.yyyy", { locale: pl }) : "--.--.----";
  const checkOutLabel = checkOut ? format(checkOut, "d.MM.yyyy", { locale: pl }) : "--.--.----";
  const handleReservationClear = () => {
    setReservationRange([null, null]);
  };

  useEffect(() => {
    if (!expandedSection) {
      return;
    }

    const hideExpandedSection = () => {
      setExpandedSection(null);
    };

    const onWheel = () => hideExpandedSection();
    const onTouchMove = () => hideExpandedSection();
    const onKeyDown = (event: KeyboardEvent) => {
      const dismissKeys = new Set([
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
      ]);

      if (dismissKeys.has(event.key)) {
        hideExpandedSection();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expandedSection]);

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (activeView === "home") {
      return;
    }

    lastScrollYRef.current = window.scrollY;

    const onScroll = () => {
      const sec2 = document.getElementById("sec2-wrapper");
      if (!sec2) {
        return;
      }

      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      const sec2Top = sec2.getBoundingClientRect().top;
      const resetPoint = window.innerHeight * 0.55;

      if (isScrollingDown && currentScrollY > 10 && sec2Top <= resetPoint) {
        setActiveView("home");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [activeView]);

  const forcedMenuColors: MenuColors | null = isRedMenuMode
    ? { font: "#be1622", logo: "#be1622" }
    : null;

  const handleFloatingLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActiveView("home");
    document.getElementById("hero-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReadMoreClick = (section: ExpandableSection) => {
    setExpandedSection(section);
    const targetId = section === "sec2" ? "sec2-wrapper" : "sec3-wrapper";
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderExpandedContent = (section: ExpandableSection) => {
    const content = EXPANDED_SECTION_CONTENT[section];

    return (
      <div className="container container-white expanded-content-container">
        <div className="expanded-content-grid">
          <div className="expanded-content-copy-col">
            <h2>{content.heading}</h2>
            <p className="expanded-content-intro">{content.intro}</p>
            <div className="expanded-content-body">
              {content.body.map((paragraph, index) => (
                <p key={`${section}-paragraph-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <aside className="expanded-content-gallery-col" aria-label="Galeria miejsca">
            {content.gallery.map((image, index) => (
              <figure className="expanded-content-gallery-item" key={`${image.src}-${index}`}>
                <img src={image.src} alt={image.alt} />
              </figure>
            ))}
          </aside>
        </div>
      </div>
    );
  };

  return (
    <>
      <TopMenu
        activeView={activeView}
        onNavigate={setActiveView}
        forceColors={forcedMenuColors}
      />

      <div className={`floating-menu-logo ${hasScrolled || isRedMenuMode ? "is-visible" : ""} ${isRedMenuMode ? "is-red" : ""}`}>
        <a
          className="floating-menu-logo__link"
          href="#hero-start"
          aria-label="Powrot do strony glownej"
          onClick={handleFloatingLogoClick}
        >
          <span className="floating-menu-logo__mark" />
        </a>
      </div>

      {/* SEKCJA HERO */}
      <section
        className="section h-95vh bg-slider"
        id="hero-start"
        data-menu-font={isMenuContentVisible ? "#be1622" : "#ffffff"}
        data-menu-logo={isMenuContentVisible ? "#be1622" : "#ffffff"}
      >
        {isMenuContentVisible ? (
          <div className="container container-white reservation-layout" aria-label="Sekcja rezerwacji">
            <div className="reservation-layout__top" />
            <div className="reservation-layout__bottom">
              <div className="reservation-system">
                <div className="reservation-system__calendar-wrap">
                  <DatePicker
                    selected={checkIn}
                    onChange={(update) => setReservationRange(update)}
                    startDate={checkIn}
                    endDate={checkOut}
                    selectsRange
                    inline
                    monthsShown={2}
                    locale={pl}
                    formatWeekDay={(dayName) => dayName.replace(".", "").slice(0, 3).toLowerCase()}
                    calendarClassName="reservation-datepicker"
                  />
                  <button type="button" className="reservation-system__clear" onClick={handleReservationClear}>
                    Wyczyść daty
                  </button>
                </div>

                <aside className="reservation-summary-card" aria-label="Podsumowanie rezerwacji">
                  <p className="reservation-summary-card__price">
                    <span>{totalPrice} zł</span> za {nights} {getNightLabel(nights)}
                  </p>

                  <div className="reservation-summary-card__dates">
                    <div className="reservation-summary-card__date-box">
                      <span>Zameldowanie</span>
                      <strong>{checkInLabel}</strong>
                    </div>
                    <div className="reservation-summary-card__date-box">
                      <span>Wymeldowanie</span>
                      <strong>{checkOutLabel}</strong>
                    </div>
                  </div>

                  <label className="reservation-summary-card__guests">
                    <span>Goście</span>
                    <select
                      name="guests"
                      value={reservationGuests}
                      onChange={(event) => setReservationGuests(event.target.value)}
                    >
                      <option value="1">1 gość</option>
                      <option value="2">2 gości</option>
                      <option value="3">3 gości</option>
                      <option value="4">4 gości</option>
                      <option value="5">5 gości</option>
                      <option value="6">6 gości</option>
                    </select>
                  </label>

                  <button type="button" className="reservation-summary-card__submit">
                    REZERWUJ
                  </button>
                  <p className="reservation-summary-card__note">Płatność nie zostanie jeszcze naliczona</p>
                </aside>
              </div>
            </div>
          </div>
        ) : (
          <div className={`hero-logo-stage ${hasScrolled ? "is-scrolled" : ""}`} aria-hidden="true">
            <img src="/assets/hommm.svg" alt="" className="hero-logo-main" />
          </div>
        )}
      </section>

      {/* STALE SEKCJE */}
      <section
        className={`section h-95vh bg-secondary ${expandedSection === "sec2" ? "" : "section-story"}`}
        id="sec2-wrapper"
        data-menu-font={expandedSection === "sec2" ? "#be1622" : "#ffffff"}
        data-menu-logo={expandedSection === "sec2" ? "#be1622" : "#ffffff"}
      >
        {expandedSection === "sec2" ? (
          renderExpandedContent("sec2")
        ) : (
          <div className="container story-container">
            <h1 className="h1-brand">YOUR SPECIAL TIME</h1>
            <h2 className="story-subtitle">KONCEPT HOMMM</h2>

            <div className="story-text-block">
              <p>
                To przykladowy blok tresci, ktory opisuje charakter miejsca i spokojny rytm
                wypoczynku. W tym obszarze mozesz dodac dowolne informacje: koncept, wartosci,
                klimat i doswiadczenie goscia. Moze to byc miejsce na opis dnia goscia: od
                porannej kawy, przez strefe relaksu, po wieczorne chwile przy swietle. Dzieki
                temu sekcja jest pelniejsza i daje wiecej kontekstu, zanim uzytkownik przejdzie do
                kolejnych fragmentow strony.
              </p>
            </div>

            <button type="button" className="story-read-more" onClick={() => handleReadMoreClick("sec2")}>
              CZYTAJ WIĘCEJ
            </button>
          </div>
        )}
      </section>

      <section
        className={`section h-95vh bg-dark ${expandedSection === "sec3" ? "" : "section-story"}`}
        id="sec3-wrapper"
        data-menu-font={expandedSection === "sec3" ? "#be1622" : "#ffffff"}
        data-menu-logo={expandedSection === "sec3" ? "#be1622" : "#ffffff"}
      >
        {expandedSection === "sec3" ? (
          renderExpandedContent("sec3")
        ) : (
          <div className="container story-container">
            <h1 className="h1-brand">YOUR SPECIAL PLACE</h1>
            <h2 className="story-subtitle">CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?</h2>

            <div className="story-text-block">
              <p>
                To przykladowy tekst do sekcji miejsca - podkresla kameralnosc, nature i
                oddech od codziennego tempa. Dodatkowe akapity moga opisywac przestrzen,
                udogodnienia, rytualy i to, co buduje wyjatkowy klimat pobytu. Mozesz tez dopisac
                informacje o apartamentach, prywatnych strefach i detalach, ktore podkreslaja
                komfort pobytu. Taki rozszerzony opis pomaga lepiej wyobrazic sobie miejsce i
                zwieksza szanse, ze odwiedzajacy kliknie dalej.
              </p>
            </div>

            <button type="button" className="story-read-more" onClick={() => handleReadMoreClick("sec3")}>
              CZYTAJ WIĘCEJ
            </button>
          </div>
        )}
      </section>

      <section
        className="section h-40vh bg-light"
        id="sec4-wrapper"
        data-menu-font="#1c1c1c"
        data-menu-logo="#1c1c1c"
      />
    </>
  );
}
