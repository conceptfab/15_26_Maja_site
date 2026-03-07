'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import Image from 'next/image';
import { TopMenu, type MenuColors, type MenuView } from '../components/TopMenu';
import {
  EXPANDED_SECTION_CONTENT,
  type ExpandableSection,
} from '../data/content';

const PRICE_PER_NIGHT = 204.5;

const DISMISS_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
]);

const getNightLabel = (nights: number) => {
  if (nights === 1) {
    return 'noc';
  }

  const mod10 = nights % 10;
  const mod100 = nights % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return 'noce';
  }

  return 'nocy';
};

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>('home');
  const [hasScrolled, setHasScrolled] = useState(false);
  const [expandedSection, setExpandedSection] =
    useState<ExpandableSection | null>(null);
  const [reservationRange, setReservationRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [reservationGuests, setReservationGuests] = useState('1');
  const isMenuContentVisible = activeView === 'rezerwuj';
  const isExpandedContentVisible = expandedSection !== null;
  const isRedMenuMode = isMenuContentVisible || isExpandedContentVisible;
  const lastScrollYRef = useRef(0);
  const [checkIn, checkOut] = reservationRange;
  const nightsRaw =
    checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;
  const nights = nightsRaw > 0 ? nightsRaw : 0;
  const totalPrice = Math.round(nights * PRICE_PER_NIGHT);
  const checkInLabel = checkIn
    ? format(checkIn, 'd.MM.yyyy', { locale: pl })
    : '--.--.----';
  const checkOutLabel = checkOut
    ? format(checkOut, 'd.MM.yyyy', { locale: pl })
    : '--.--.----';
  const today = new Date();
  const handleReservationClear = () => {
    setReservationRange([null, null]);
  };

  useEffect(() => {
    if (!expandedSection) {
      return;
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
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

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedSection]);

  useEffect(() => {
    if (activeView !== 'home') {
      lastScrollYRef.current = window.scrollY;
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        setHasScrolled(currentScrollY > 10);
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

        if (activeView !== 'home') {
          const sec2 = document.getElementById('sec2-wrapper');
          if (sec2) {
            const isScrollingDown = currentScrollY > lastScrollYRef.current;
            const sec2Top = sec2.getBoundingClientRect().top;
            const resetPoint = window.innerHeight * 0.55;

            if (
              isScrollingDown &&
              currentScrollY > 10 &&
              sec2Top <= resetPoint
            ) {
              setActiveView('home');
            }
          }
          lastScrollYRef.current = currentScrollY;
        }

        if (isMobileViewport && activeView === 'rezerwuj') {
          const heroSection = document.getElementById('hero-start');
          if (heroSection) {
            const rect = heroSection.getBoundingClientRect();
            const isOutOfViewport =
              rect.bottom <= 0 || rect.top >= window.innerHeight;

            if (isOutOfViewport) {
              setActiveView('home');
            }
          }
        }

        if (isMobileViewport && expandedSection) {
          const expandedWrapperId =
            expandedSection === 'sec2' ? 'sec2-wrapper' : 'sec3-wrapper';
          const expandedWrapper = document.getElementById(expandedWrapperId);

          if (expandedWrapper) {
            const rect = expandedWrapper.getBoundingClientRect();
            const isOutOfViewport =
              rect.bottom <= 0 || rect.top >= window.innerHeight;

            if (isOutOfViewport) {
              setExpandedSection(null);
            }
          }
        }

        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeView, expandedSection]);

  const forcedMenuColors: MenuColors | null = isRedMenuMode
    ? { font: '#be1622', logo: '#be1622' }
    : null;

  const handleFloatingLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActiveView('home');
    document
      .getElementById('hero-start')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReadMoreClick = (section: ExpandableSection) => {
    setExpandedSection(section);
    const targetId = section === 'sec2' ? 'sec2-wrapper' : 'sec3-wrapper';
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

          <aside
            className="expanded-content-gallery-col"
            aria-label="Galeria miejsca"
          >
            {content.gallery.map((image, index) => (
              <figure
                className="expanded-content-gallery-item"
                key={`${image.src}-${index}`}
              >
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

      <div
        className={`floating-menu-logo ${hasScrolled || isRedMenuMode ? 'is-visible' : ''} ${isRedMenuMode ? 'is-red' : ''}`}
      >
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
        className="section h-100vh bg-slider"
        id="hero-start"
        data-menu-font={isMenuContentVisible ? '#be1622' : '#ffffff'}
        data-menu-logo={isMenuContentVisible ? '#be1622' : '#ffffff'}
      >
        {isMenuContentVisible ? (
          <div
            className="container container-white reservation-layout"
            aria-label="Sekcja rezerwacji"
          >
            <div className="reservation-layout__top">
              <div className="reservation-promo">
                <h2 className="heading-secondary">ZAREZERWUJ SWÓJ CZAS</h2>
                <p className="reservation-promo__text">
                  Wybierz daty i poczuj spokój Hommm. Nasz kalendarz pokazuje
                  aktualną dostępność apartamentów. Zaplanuj swój pobyt w
                  miejscu, gdzie natura spotyka się z komfortem.
                </p>
              </div>

              <div className="reservation-visual-gallery">
                <figure className="reservation-visual-item reservation-visual-item--large">
                  <Image
                    src="/assets/sec_2.jpg"
                    alt="Widok Hommm"
                    fill
                    sizes="40vw"
                  />
                </figure>
                <figure className="reservation-visual-item">
                  <Image
                    src="/assets/sec_3.jpg"
                    alt="Detale Hommm"
                    fill
                    sizes="20vw"
                  />
                </figure>
                <figure className="reservation-visual-item">
                  <Image
                    src="/assets/hero.jpg"
                    alt="Klimat Hommm"
                    fill
                    sizes="20vw"
                  />
                </figure>
              </div>
            </div>
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
                    formatWeekDay={(dayName) =>
                      dayName.replace('.', '').slice(0, 3).toLowerCase()
                    }
                    calendarClassName="reservation-datepicker"
                    fixedHeight
                  />
                </div>
                <button
                  type="button"
                  className="reservation-system__clear"
                  onClick={handleReservationClear}
                  title="Wyczyść daty"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="20"
                    height="20"
                  >
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                    <path d="M22 21H7" />
                    <path d="m5 11 9 9" />
                  </svg>
                </button>

                <aside
                  className="reservation-summary-card"
                  aria-label="Podsumowanie rezerwacji"
                >
                  <p className="reservation-summary-card__price">
                    <span>{totalPrice} zł</span> za {nights}{' '}
                    {getNightLabel(nights)}
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
                        onChange={(event) =>
                          setReservationGuests(event.target.value)
                        }
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

                  <button
                    type="button"
                    className="reservation-summary-card__submit"
                  >
                    REZERWUJ
                  </button>
                  <p className="reservation-summary-card__note">
                    Płatność nie zostanie jeszcze naliczona
                  </p>
                </aside>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`hero-logo-stage ${hasScrolled ? 'is-scrolled' : ''}`}
            aria-hidden="true"
          >
            <img src="/assets/hommm.svg" alt="" className="hero-logo-main" />
          </div>
        )}
      </section>

      {/* STALE SEKCJE */}
      <section
        className={`section h-100vh bg-secondary ${expandedSection === 'sec2' ? '' : 'section-story'}`}
        id="sec2-wrapper"
        data-menu-font={expandedSection === 'sec2' ? '#be1622' : '#ffffff'}
        data-menu-logo={expandedSection === 'sec2' ? '#be1622' : '#ffffff'}
      >
        {expandedSection === 'sec2' ? (
          renderExpandedContent('sec2')
        ) : (
          <div className="container story-container">
            <h1 className="h1-brand">YOUR SPECIAL TIME</h1>
            <h2 className="heading-secondary story-subtitle">KONCEPT HOMMM</h2>

            <div className="story-text-block">
              <p>
                To przykladowy blok tresci, ktory opisuje charakter miejsca i
                spokojny rytm wypoczynku. W tym obszarze mozesz dodac dowolne
                informacje: koncept, wartosci, klimat i doswiadczenie goscia.
                Moze to byc miejsce na opis dnia goscia: od porannej kawy, przez
                strefe relaksu, po wieczorne chwile przy swietle. Dzieki temu
                sekcja jest pelniejsza i daje wiecej kontekstu, zanim uzytkownik
                przejdzie do kolejnych fragmentow strony.
              </p>
            </div>

            <button
              type="button"
              className="story-read-more"
              onClick={() => handleReadMoreClick('sec2')}
            >
              CZYTAJ WIĘCEJ
            </button>
          </div>
        )}
      </section>

      <section
        className={`section h-100vh bg-dark ${expandedSection === 'sec3' ? '' : 'section-story'}`}
        id="sec3-wrapper"
        data-menu-font={expandedSection === 'sec3' ? '#be1622' : '#ffffff'}
        data-menu-logo={expandedSection === 'sec3' ? '#be1622' : '#ffffff'}
      >
        {expandedSection === 'sec3' ? (
          renderExpandedContent('sec3')
        ) : (
          <div className="container story-container">
            <h1 className="h1-brand">YOUR SPECIAL PLACE</h1>
            <h2 className="heading-secondary story-subtitle">
              CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?
            </h2>

            <div className="story-text-block">
              <p>
                To przykladowy tekst do sekcji miejsca - podkresla kameralnosc,
                nature i oddech od codziennego tempa. Dodatkowe akapity moga
                opisywac przestrzen, udogodnienia, rytualy i to, co buduje
                wyjatkowy klimat pobytu. Mozesz tez dopisac informacje o
                apartamentach, prywatnych strefach i detalach, ktore podkreslaja
                komfort pobytu. Taki rozszerzony opis pomaga lepiej wyobrazic
                sobie miejsce i zwieksza szanse, ze odwiedzajacy kliknie dalej.
              </p>
            </div>

            <button
              type="button"
              className="story-read-more"
              onClick={() => handleReadMoreClick('sec3')}
            >
              CZYTAJ WIĘCEJ
            </button>
          </div>
        )}
      </section>

      <section
        className="section h-40vh bg-light"
        id="sec4-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container footer-container">
          <div className="footer-grid">
            <div className="footer-column footer-column--corporate">
              <h3 className="footer-column__title">DANE KORPORACYJNE:</h3>
              <div className="footer-column__content">
                <p>Banana Gun Design Maria Budner</p>
                <p>ul. Sanocka 39 m 5</p>
                <p>93-038 Łódź</p>
                <p>NIP 7292494164</p>
              </div>
            </div>
            <div className="footer-column footer-column--center footer-column--spacer">
              {/* Pusta kolumna 2 */}
            </div>
            <div className="footer-column footer-column--center footer-column--brand">
              <a
                href="#hero-start"
                onClick={handleFloatingLogoClick}
                className="footer-logo-link"
              >
                <img
                  src="/assets/hommm.svg"
                  alt="HOMMM"
                  className="footer-logo"
                />
              </a>
              <div className="footer-nav-group">
                <a href="#sec2-wrapper" className="footer-nav-link">
                  KONCEPT
                </a>
                <a href="#sec3-wrapper" className="footer-nav-link">
                  MIEJSCA
                </a>
                <button
                  type="button"
                  className="footer-nav-link"
                  onClick={() => {
                    setActiveView('rezerwuj');
                    document
                      .getElementById('hero-start')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  REZERWUJ
                </button>
              </div>
            </div>
            <div className="footer-column footer-column--center footer-column--spacer">
              {/* Pusta kolumna 4 */}
            </div>
            <div className="footer-column footer-column--contact">
              <h3 className="footer-column__title">KONTAKT:</h3>
              <div className="footer-column__content footer-contact">
                <a
                  href="mailto:hommm@hommm.eu"
                  className="footer-contact__link"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span>hommm@hommm.eu</span>
                </a>
                <a href="tel:+48608259945" className="footer-contact__link">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>608 259 945</span>
                </a>

                <div className="footer-socials">
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="footer-socials__link"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                  <a
                    href="#"
                    aria-label="TikTok"
                    className="footer-socials__link"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                    </svg>
                    <span>TikTok</span>
                  </a>
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="footer-socials__link"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                    <span>Facebook</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-banner">
          <Image
            src="/assets/baner.jpg"
            alt="Baner stopki"
            width={1920}
            height={400}
            className="footer-banner__img"
          />
        </div>
      </section>
    </>
  );
}
