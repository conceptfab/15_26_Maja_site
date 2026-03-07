"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { pl } from "date-fns/locale";
import DatePicker from "react-datepicker";
import Image from "next/image";
import { TopMenu, type MenuColors, type MenuView } from "../components/TopMenu";
import { EXPANDED_SECTION_CONTENT, type ExpandableSection } from "../data/content";

const PRICE_PER_NIGHT = 204.5;

const DISMISS_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
]);

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

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>("home");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandableSection | null>(null);
  const [reservationRange, setReservationRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [reservationGuests, setReservationGuests] = useState("1");
  const isMenuContentVisible = activeView === "rezerwuj";
  const isExpandedContentVisible = expandedSection !== null;
  const isRedMenuMode = isMenuContentVisible || isExpandedContentVisible;
  const lastScrollYRef = useRef(0);
  const [checkIn, checkOut] = reservationRange;
  const nightsRaw = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;
  const nights = nightsRaw > 0 ? nightsRaw : 0;
  const totalPrice = Math.round(nights * PRICE_PER_NIGHT);
  const checkInLabel = checkIn ? format(checkIn, "d.MM.yyyy", { locale: pl }) : "--.--.----";
  const checkOutLabel = checkOut ? format(checkOut, "d.MM.yyyy", { locale: pl }) : "--.--.----";
  const today = new Date();
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
      if (DISMISS_KEYS.has(event.key)) {
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
    if (activeView !== "home") {
      lastScrollYRef.current = window.scrollY;
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        setHasScrolled(currentScrollY > 10);

        if (activeView !== "home") {
          const sec2 = document.getElementById("sec2-wrapper");
          if (sec2) {
            const isScrollingDown = currentScrollY > lastScrollYRef.current;
            const sec2Top = sec2.getBoundingClientRect().top;
            const resetPoint = window.innerHeight * 0.55;

            if (isScrollingDown && currentScrollY > 10 && sec2Top <= resetPoint) {
              setActiveView("home");
            }
          }
          lastScrollYRef.current = currentScrollY;
        }

        ticking = false;
      });
    };

    onScroll();
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
            <h2 className="heading-secondary">{content.heading}</h2>
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
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 92vw, 40vw"
                />
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
                    minDate={today}
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

                  <div className="reservation-summary-card__fields">
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
                  </div>

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
            <h2 className="heading-secondary story-subtitle">KONCEPT HOMMM</h2>

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
            <h2 className="heading-secondary story-subtitle">CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?</h2>

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
