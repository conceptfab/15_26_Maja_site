'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import Image from 'next/image';
import { TopMenu, type MenuColors, type MenuView } from '../components/TopMenu';
import {
  EXPANDED_SECTION_CONTENT,
  type ExpandableSection,
} from '../data/content';
import {
  EraserIcon,
  MailIcon,
  PhoneIcon,
  InstagramIcon,
  TikTokIcon,
  FacebookIcon,
} from '../components/Icons';

const BRAND_COLOR = '#be1622';
const PRICE_PER_NIGHT = 204.5;
const SCROLL_COMPACT_THRESHOLD = 10;
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
  const isReservationView =
    activeView === 'miejsca' || activeView === 'rezerwuj';
  const showReservationGallery = activeView === 'miejsca';
  const isExpandedContentVisible = expandedSection !== null;
  const isRedMenuMode = isReservationView || isExpandedContentVisible;
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(false);
  const navGuardRef = useRef(false);
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
  const today = useMemo(() => new Date(), []);

  const scrollToHeroStart = () => {
    document
      .getElementById('hero-start')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navigateTo = (view: MenuView) => {
    const isNextReservationView = view === 'miejsca' || view === 'rezerwuj';

    if (isNextReservationView && activeView !== view) {
      navGuardRef.current = true;
      setTimeout(() => {
        navGuardRef.current = false;
      }, 900);
    }

    setActiveView(view);
  };

  const handleReservationClear = () => {
    setReservationRange([null, null]);
  };

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    isMobileRef.current = mql.matches;

    const onChange = (event: MediaQueryListEvent) => {
      isMobileRef.current = event.matches;
    };

    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (activeView !== 'home') {
      lastScrollYRef.current = window.scrollY;
    }

    let ticking = false;

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const isMobile = isMobileRef.current;
        const hasReservationDates = reservationRange[0] !== null;

        setHasScrolled(currentScrollY > SCROLL_COMPACT_THRESHOLD);

        if (activeView !== 'home' && !navGuardRef.current) {
          const isScrollingDown = currentScrollY > lastScrollYRef.current;

          if (isReservationView) {
            if (!hasReservationDates) {
              const heroSection = document.getElementById('hero-start');

              if (
                heroSection &&
                isScrollingDown &&
                currentScrollY > SCROLL_COMPACT_THRESHOLD &&
                heroSection.getBoundingClientRect().bottom <= 0
              ) {
                setActiveView('home');
              }
            }
          } else {
            const sec2 = document.getElementById('sec2-wrapper');

            if (sec2) {
              const sec2Top = sec2.getBoundingClientRect().top;

              if (
                isScrollingDown &&
                currentScrollY > SCROLL_COMPACT_THRESHOLD &&
                sec2Top <= 0
              ) {
                setActiveView('home');
              }
            }
          }

          lastScrollYRef.current = currentScrollY;
        }

        if (expandedSection && isMobile) {
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
  }, [activeView, expandedSection, isReservationView, reservationRange]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.is-revealed)');
    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activeView, expandedSection]);

  useEffect(() => {
    if (!expandedSection || isMobileRef.current) {
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

  const forcedMenuColors: MenuColors | null = isRedMenuMode
    ? { font: BRAND_COLOR, logo: BRAND_COLOR }
    : null;

  const handleFloatingLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActiveView('home');
    scrollToHeroStart();
  };

  const handleReadMoreClick = (section: ExpandableSection) => {
    setExpandedSection(section);
    const targetId = section === 'sec2' ? 'sec2-wrapper' : 'sec3-wrapper';

    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFooterNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSocialClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  };

  const handleReservationSubmit = () => {
    if (!checkIn || !checkOut) {
      return;
    }

    const params = new URLSearchParams({
      checkin: format(checkIn, 'yyyy-MM-dd'),
      checkout: format(checkOut, 'yyyy-MM-dd'),
      guests: reservationGuests,
    });

    window.location.href = `mailto:hommm@hommm.eu?subject=${encodeURIComponent('Rezerwacja HOMMM')}&body=${encodeURIComponent(
      `Zameldowanie: ${checkInLabel}\nWymeldowanie: ${checkOutLabel}\nGoscie: ${reservationGuests}\nLiczba nocy: ${nights}\nCena: ${totalPrice} zl\n\n${params.toString()}`
    )}`;
  };

  const renderReservationSystem = () => (
    <div className="reservation-layout__bottom">
      <div
        className={
          showReservationGallery
            ? 'reservation-system'
            : 'reservation-system reservation-system--panel-only'
        }
      >
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
          title="Wyczysc daty"
        >
          <EraserIcon />
        </button>

        <aside
          className="reservation-summary-card"
          aria-label="Podsumowanie rezerwacji"
        >
          <p className="reservation-summary-card__price">
            <span>{totalPrice} zl</span> za {nights} {getNightLabel(nights)}
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
              <span>Goscie</span>
              <select
                name="guests"
                value={reservationGuests}
                onChange={(event) => setReservationGuests(event.target.value)}
              >
                <option value="1">1 gosc</option>
                <option value="2">2 gosci</option>
                <option value="3">3 gosci</option>
                <option value="4">4 gosci</option>
                <option value="5">5 gosci</option>
                <option value="6">6 gosci</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="reservation-summary-card__submit"
            onClick={handleReservationSubmit}
            disabled={!checkIn || !checkOut}
          >
            REZERWUJ
          </button>

          <p className="reservation-summary-card__note">
            Platnosc nie zostanie jeszcze naliczona
          </p>
        </aside>
      </div>
    </div>
  );

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
        onNavigate={navigateTo}
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

      <section
        className="section h-100vh bg-slider"
        id="hero-start"
        data-menu-font={isReservationView ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={isReservationView ? BRAND_COLOR : '#ffffff'}
      >
        {isReservationView ? (
          <div
            className={`container container-white reservation-layout ${showReservationGallery ? '' : 'reservation-layout--panel-only'}`}
            aria-label="Sekcja rezerwacji"
          >
            {showReservationGallery ? (
              <div className="reservation-layout__top">
                <div className="reservation-promo">
                  <h2 className="heading-secondary">ZAREZERWUJ SWOJ CZAS</h2>
                  <p className="reservation-promo__text">
                    Wybierz daty i poczuj spokoj Hommm. Nasz kalendarz pokazuje
                    aktualna dostepnosc apartamentow. Zaplanuj swoj pobyt w
                    miejscu, gdzie natura spotyka sie z komfortem.
                  </p>
                </div>

                <div className="reservation-visual-gallery">
                  <figure className="reservation-visual-item reservation-visual-item--large">
                    <Image
                      src="/assets/sec_2.jpg"
                      alt="Widok Hommm"
                      fill
                      priority
                      sizes="40vw"
                    />
                  </figure>
                  <figure className="reservation-visual-item">
                    <Image
                      src="/assets/sec_3.jpg"
                      alt="Detale Hommm"
                      fill
                      priority
                      sizes="20vw"
                    />
                  </figure>
                  <figure className="reservation-visual-item">
                    <Image
                      src="/assets/hero.jpg"
                      alt="Klimat Hommm"
                      fill
                      priority
                      sizes="20vw"
                    />
                  </figure>
                </div>
              </div>
            ) : null}

            {renderReservationSystem()}
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

      <section
        className={`section h-100vh bg-secondary ${expandedSection === 'sec2' ? '' : 'section-story'}`}
        id="sec2-wrapper"
        data-menu-font={expandedSection === 'sec2' ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={expandedSection === 'sec2' ? BRAND_COLOR : '#ffffff'}
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
              CZYTAJ WIECEJ
            </button>
          </div>
        )}
      </section>

      <section
        className={`section h-100vh bg-dark ${expandedSection === 'sec3' ? '' : 'section-story'}`}
        id="sec3-wrapper"
        data-menu-font={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
      >
        {expandedSection === 'sec3' ? (
          renderExpandedContent('sec3')
        ) : (
          <div className="container story-container">
            <h2 className="h1-brand">YOUR SPECIAL PLACE</h2>
            <h3 className="heading-secondary story-subtitle">
              CHCESZ WYPOCZAC W CISZY I OTOCZENIU NATURY?
            </h3>

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
              CZYTAJ WIECEJ
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
            <div
              className="footer-column footer-column--corporate reveal reveal--up"
              style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
            >
              <h3 className="footer-column__title">DANE KORPORACYJNE:</h3>
              <div className="footer-column__content">
                <p>Banana Gun Design Maria Budner</p>
                <p>ul. Sanocka 39 m 5</p>
                <p>93-038 Lodz</p>
                <p>NIP 7292494164</p>
              </div>
            </div>

            <div className="footer-column footer-column--center footer-column--spacer">
              {/* Pusta kolumna 2 */}
            </div>

            <div className="footer-column footer-column--center footer-column--brand reveal reveal--scale">
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
                <a
                  href="#sec2-wrapper"
                  className="footer-nav-link"
                  onClick={(event) => handleFooterNavClick(event, 'sec2-wrapper')}
                >
                  KONCEPT
                </a>

                <button
                  type="button"
                  className="footer-nav-link"
                  onClick={() => {
                    navigateTo('miejsca');
                    scrollToHeroStart();
                  }}
                >
                  MIEJSCA
                </button>

                <button
                  type="button"
                  className="footer-nav-link"
                  onClick={() => {
                    navigateTo('rezerwuj');
                    scrollToHeroStart();
                  }}
                >
                  REZERWUJ
                </button>
              </div>
            </div>

            <div className="footer-column footer-column--center footer-column--spacer">
              {/* Pusta kolumna 4 */}
            </div>

            <div
              className="footer-column footer-column--contact reveal reveal--up"
              style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
            >
              <h3 className="footer-column__title">KONTAKT:</h3>
              <div className="footer-column__content footer-contact">
                <a
                  href="mailto:hommm@hommm.eu"
                  className="footer-contact__link"
                >
                  <MailIcon />
                  <span>hommm@hommm.eu</span>
                </a>

                <a href="tel:+48608259945" className="footer-contact__link">
                  <PhoneIcon />
                  <span>608 259 945</span>
                </a>

                <div className="footer-socials">
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="footer-socials__link"
                    onClick={handleSocialClick}
                  >
                    <InstagramIcon />
                    <span>Instagram</span>
                  </a>

                  <a
                    href="#"
                    aria-label="TikTok"
                    className="footer-socials__link"
                    onClick={handleSocialClick}
                  >
                    <TikTokIcon />
                    <span>TikTok</span>
                  </a>

                  <a
                    href="#"
                    aria-label="Facebook"
                    className="footer-socials__link"
                    onClick={handleSocialClick}
                  >
                    <FacebookIcon />
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
