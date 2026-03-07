"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type MenuColors = {
  font: string;
  logo: string;
};

const DEFAULT_COLORS: MenuColors = {
  font: "#ffffff",
  logo: "#ffffff",
};

export function TopMenu() {
  const [isCompact, setIsCompact] = useState(false);
  const [colors, setColors] = useState<MenuColors>(DEFAULT_COLORS);

  useEffect(() => {
    const onScroll = () => {
      setIsCompact(window.scrollY > 24);
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
      setColors({ font, logo });
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

  const navStyle = useMemo(
    () =>
      ({
        "--menu-font-color": colors.font,
        "--menu-logo-color": colors.logo,
      }) as CSSProperties,
    [colors],
  );

  return (
    <nav
      className={`top-menu ${isCompact ? "is-compact" : ""}`}
      style={navStyle}
      aria-label="Main menu"
    >
      <div className="top-menu-shell">
        <div className="top-menu-row top-menu-row-logo">
          <a className="menu-home-link" href="#hero-start" aria-label="Powrot do home">
            <span className="menu-logo" />
          </a>
        </div>

        <div className="top-menu-row top-menu-row-bottom">
          <div className="menu-main" role="menubar">
            <a href="#hero-start">koncept</a>
            <a href="#sec2-wrapper">miejsca</a>
            <a href="#sec4-wrapper">rezerwuj</a>
          </div>

          <div className="menu-langs">
            <a href="#" className="is-active" lang="pl" aria-label="Polski">
              PL
            </a>
            <a href="#" lang="en" aria-label="English">
              EN
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
