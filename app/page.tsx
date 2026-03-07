"use client";

import { useEffect, useRef, useState } from "react";
import { TopMenu, type MenuColors, type MenuView } from "../components/TopMenu";

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

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>("home");
  const isMenuContentVisible = activeView === "rezerwuj";
  const lastScrollYRef = useRef(0);

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

  const forcedMenuColors: MenuColors | null = isMenuContentVisible
    ? { font: "#be1622", logo: "#be1622" }
    : null;

  const activeMenuContent = isMenuContentVisible ? MENU_SECTION_CONTENT.rezerwuj : null;

  return (
    <>
      <TopMenu
        activeView={activeView}
        onNavigate={setActiveView}
        forceColors={forcedMenuColors}
      />

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
        ) : null}
      </section>

      {/* STALE SEKCJE */}
      <section
        className="section h-95vh bg-secondary section-story"
        id="sec2-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container story-container">
          <h1 className="h1-brand">YOUR SPECIAL TIME</h1>
          <h2 className="story-subtitle">KONCEPT HOMMM</h2>

          <div className="story-text-block">
            <p>
              To przykladowy blok tresci, ktory opisuje charakter miejsca i spokojny rytm
              wypoczynku.
            </p>
            <p>
              W tym obszarze mozesz dodac dowolne informacje: koncept, wartosci, klimat i
              doswiadczenie goscia.
            </p>
          </div>

          <button type="button" className="story-read-more">
            CZYTAJ WIĘCEJ
          </button>
        </div>
      </section>

      <section
        className="section h-95vh bg-dark section-story"
        id="sec3-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container story-container">
          <h1 className="h1-brand">YOUR SPECIAL PLACE</h1>
          <h2 className="story-subtitle">CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?</h2>

          <div className="story-text-block">
            <p>
              To przykladowy tekst do sekcji miejsca - podkresla kameralnosc, nature i
              oddech od codziennego tempa.
            </p>
            <p>
              Dodatkowe akapity moga opisywac przestrzen, udogodnienia, rytualy i to, co
              buduje wyjatkowy klimat pobytu.
            </p>
          </div>

          <button type="button" className="story-read-more">
            CZYTAJ WIĘCEJ
          </button>
        </div>
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
