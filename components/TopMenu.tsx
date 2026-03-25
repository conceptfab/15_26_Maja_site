"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

export type MenuView = "home" | "koncept" | "miejsca" | "rezerwuj";

export type MenuColors = {
  font: string;
  logo: string;
};

type TopMenuProps = {
  activeView?: MenuView;
  onNavigate?: (view: MenuView) => void;
  forceColors?: MenuColors | null;
};

const DEFAULT_COLORS: MenuColors = {
  font: "#ffffff",
  logo: "#ffffff",
};

const MENU_ITEMS: Array<{ id: Exclude<MenuView, "home">; label: string }> = [
  { id: "koncept", label: "koncept" },
  { id: "miejsca", label: "miejsca" },
  { id: "rezerwuj", label: "rezerwuj" },
];

export function TopMenu({ activeView = "home", onNavigate, forceColors = null }: TopMenuProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sectionColors, setSectionColors] = useState<MenuColors>(DEFAULT_COLORS);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsCompact(window.scrollY > 24);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        "section[data-menu-font], section[data-menu-logo]",
      ),
    );

    if (sections.length === 0) {
      return;
    }

    const applyColors = (section: HTMLElement) => {
      const font = section.dataset.menuFont ?? DEFAULT_COLORS.font;
      const logo = section.dataset.menuLogo ?? font;
      setSectionColors({ font, logo });
    };

    const pickInitialSection =
      sections.find((section) => {
        const rect = section.getBoundingClientRect();
        const marker = window.innerHeight * 0.35;
        return rect.top <= marker && rect.bottom > marker;
      }) ?? sections[0];

    applyColors(pickInitialSection);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          applyColors(visible[0].target as HTMLElement);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 769px)");

    const handleViewportChange = () => {
      if (mediaQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    handleViewportChange();
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobileMenuOpen]);

  const resolvedColors = forceColors ?? sectionColors;
  const normalizedFontColor = resolvedColors.font.trim().toLowerCase();
  const isRedMenuMode = normalizedFontColor === "#be1622";

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleMenuClick = (
    event: MouseEvent<HTMLAnchorElement>,
    view: Exclude<MenuView, "home">,
  ) => {
    event.preventDefault();

    if (view === "miejsca" || view === "rezerwuj") {
      onNavigate?.(view);
      scrollToSection("hero-start");
      setIsMobileMenuOpen(false);
      return;
    }

    onNavigate?.("home");
    scrollToSection(view === "koncept" ? "sec2-wrapper" : "sec3-wrapper");
    setIsMobileMenuOpen(false);
  };

  const handleLangClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  };

  const navStyle = useMemo(
    () =>
      ({
        "--menu-font-color": resolvedColors.font,
        "--menu-logo-color": resolvedColors.logo,
      }) as CSSProperties,
    [resolvedColors.font, resolvedColors.logo],
  );

  return (
    <nav
      className={`top-menu ${isCompact ? "is-compact" : ""} ${
        isRedMenuMode ? "is-red-menu" : "is-white-menu"
      }`}
      style={navStyle}
      aria-label="Main menu"
    >
      <div className="top-menu-shell">
        <button
          type="button"
          className={`top-menu-hamburger ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otworz menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-menu-links"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id="main-menu-links"
          className={`top-menu-row top-menu-row-bottom ${isMobileMenuOpen ? "is-open" : ""}`}
        >
          <div className="menu-main">
            {MENU_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id === "koncept" ? "sec2-wrapper" : "hero-start"}`}
                onClick={(event) => handleMenuClick(event, item.id)}
                className={activeView === item.id ? "is-current" : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="menu-langs">
            <a href="#" className="is-active" lang="pl" aria-label="Polski" onClick={handleLangClick}>
              PL
            </a>
            <a href="#" lang="en" aria-label="English" onClick={handleLangClick}>
              EN
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
