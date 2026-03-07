"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { TopMenu, type MenuColors, type MenuView } from "../components/TopMenu";

type ExpandableSection = "sec2" | "sec3";

const MENU_SECTION_CONTENT: Record<
  Exclude<MenuView, "home">,
  {
    heading: string;
    intro: string;
    sections: Array<{ title: string; text: string }>;
  }
> = {
  koncept: {
    heading: "Koncept - Sekcje specjalne",
    intro: "Po kliknieciu menu pokazujemy nowy zestaw tresci bez zmiany ukladu strony.",
    sections: [
      {
        title: "Sekcja Koncept 01",
        text: "Opis koncepcji i klimat marki. Te bloki sa wyswietlane zamiast podstawowej tresci sekcji 1.",
      },
      {
        title: "Sekcja Koncept 02",
        text: "Mozesz tu umiescic storytelling, wyróżniki lub informacje o stylu miejsca.",
      },
      {
        title: "Sekcja Koncept 03",
        text: "Trzeci blok na call to action, linki i dalsze przejscia po stronie.",
      },
    ],
  },
  miejsca: {
    heading: "Miejsca - Sekcje specjalne",
    intro: "Widok menu podmienia tresc sekcji 1 i zachowuje menu na gorze.",
    sections: [
      {
        title: "Sekcja Miejsca 01",
        text: "Lista lokalizacji lub sal. Mozesz tu dodac grafiki i opisy.",
      },
      {
        title: "Sekcja Miejsca 02",
        text: "Dodatkowe informacje o przestrzeni, pojemnosci i dostepnosci.",
      },
      {
        title: "Sekcja Miejsca 03",
        text: "Zachowujemy ten sam layout, ale pokazujemy inne dane dla kliknietej pozycji menu.",
      },
    ],
  },
  rezerwuj: {
    heading: "Rezerwuj - Sekcje specjalne",
    intro: "To miejsce na informacje o rezerwacji i formularzu kontaktowym.",
    sections: [
      {
        title: "Sekcja Rezerwuj 01",
        text: "Warunki, terminy i podstawowe informacje potrzebne przed rezerwacja.",
      },
      {
        title: "Sekcja Rezerwuj 02",
        text: "Proces krok po kroku: zapytanie, potwierdzenie, finalizacja.",
      },
      {
        title: "Sekcja Rezerwuj 03",
        text: "Sekcja CTA: numer telefonu, mail i przycisk szybkiej rezerwacji.",
      },
    ],
  },
};

const EXPANDED_SECTION_CONTENT: Record<
  ExpandableSection,
  {
    heading: string;
    intro: string;
    sections: Array<{ title: string; text: string }>;
    gallery: Array<{ src: string; alt: string }>;
  }
> = {
  sec2: {
    heading: "KONCEPT HOMMM",
    intro: "Rozszerzona tresc konceptu widoczna bez opuszczania tej sekcji.",
    sections: [
      {
        title: "Koncept 01",
        text: "Opis klimatu, rytmu dnia i charakteru wypoczynku w tej czesci oferty.",
      },
      {
        title: "Koncept 02",
        text: "Miejsce na storytelling, detale doswiadczenia i kluczowe wyrozniki.",
      },
      {
        title: "Koncept 03",
        text: "Przestrzen na dalsze przejscia: cennik, pakiety lub kontakt.",
      },
    ],
    gallery: [
      { src: "/assets/sec_2.jpg", alt: "Strefa relaksu i natura" },
      { src: "/assets/hero.jpg", alt: "Widok glownej przestrzeni" },
      { src: "/assets/sec_3.jpg", alt: "Detale miejsca" },
    ],
  },
  sec3: {
    heading: "YOUR SPECIAL PLACE",
    intro: "Rozszerzona tresc miejsca widoczna w tej samej sekcji po kliknieciu.",
    sections: [
      {
        title: "Miejsce 01",
        text: "Informacje o przestrzeni, ukladzie i prywatnych strefach dla gosci.",
      },
      {
        title: "Miejsce 02",
        text: "Opis udogodnien, natury dookola i elementow budujacych spokoj.",
      },
      {
        title: "Miejsce 03",
        text: "Sekcja na konkrety: terminy, zasady pobytu i dalsze kroki.",
      },
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
  const isMenuContentVisible = activeView === "rezerwuj";
  const isExpandedContentVisible = expandedSection !== null;
  const isRedMenuMode = isMenuContentVisible || isExpandedContentVisible;
  const lastScrollYRef = useRef(0);

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

  const activeMenuContent = isMenuContentVisible ? MENU_SECTION_CONTENT.rezerwuj : null;

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
            <div className="expanded-content-texts">
              {content.sections.map((block) => (
                <article className="expanded-content-text-block" key={block.title}>
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </article>
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
        {isMenuContentVisible && activeMenuContent ? (
          <div className="container container-white">
            <>
              <h2>{activeMenuContent.heading}</h2>
              <p>{activeMenuContent.intro}</p>
              <div className="hero-menu-sections">
                {activeMenuContent.sections.map((section) => (
                  <article className="hero-menu-card" key={section.title}>
                    <h3>{section.title}</h3>
                    <p>{section.text}</p>
                  </article>
                ))}
              </div>
            </>
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
