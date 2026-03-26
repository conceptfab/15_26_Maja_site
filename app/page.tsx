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
  const showFloatingMenuLogo =
    (hasScrolled || isRedMenuMode) && activeView !== 'miejsca';
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

  const handlePlacesLogoMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (isMobileRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

    event.currentTarget.style.setProperty(
      '--places-logo-mouse-x',
      offsetX.toFixed(3),
    );
    event.currentTarget.style.setProperty(
      '--places-logo-mouse-y',
      offsetY.toFixed(3),
    );
  };

  const handlePlacesLogoMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--places-logo-mouse-x', '0');
    event.currentTarget.style.setProperty('--places-logo-mouse-y', '0');
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
      `Zameldowanie: ${checkInLabel}\nWymeldowanie: ${checkOutLabel}\nGoście: ${reservationGuests}\nLiczba nocy: ${nights}\nCena: ${totalPrice} zł\n\n${params.toString()}`
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
        <div className="reservation-system__calendar-col">
          <DatePicker
            selected={checkIn}
            onChange={(update) => setReservationRange(update)}
            startDate={checkIn}
            endDate={checkOut}
            selectsRange
            inline
            monthsShown={1}
            locale={pl}
            minDate={today}
            formatWeekDay={(dayName) =>
              dayName.replace('.', '').slice(0, 3).toLowerCase()
            }
            calendarClassName="reservation-datepicker"
            fixedHeight
          />
        </div>

        <div className="reservation-system__calendar-col">
          <DatePicker
            selected={checkIn}
            onChange={(update) => setReservationRange(update)}
            startDate={checkIn}
            endDate={checkOut}
            selectsRange
            inline
            monthsShown={1}
            locale={pl}
            minDate={today}
            openToDate={new Date(today.getFullYear(), today.getMonth() + 1, 1)}
            formatWeekDay={(dayName) =>
              dayName.replace('.', '').slice(0, 3).toLowerCase()
            }
            calendarClassName="reservation-datepicker"
            fixedHeight
          />

        </div>

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
              <span>Goście</span>
              <select
                name="guests"
                value={reservationGuests}
                onChange={(event) => setReservationGuests(event.target.value)}
              >
                <option value="1">1 gosc</option>
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
            onClick={handleReservationSubmit}
            disabled={!checkIn || !checkOut}
          >
            REZERWUJ
          </button>

          <p className="reservation-summary-card__note">
            Płatność nie zostanie jeszcze naliczona
          </p>

        </aside>

        <button
          type="button"
          className="reservation-system__clear"
          onClick={handleReservationClear}
          style={{ gridColumn: 2, justifySelf: 'end' }}
        >
          <EraserIcon />
          <span>Wyczyść daty</span>
        </button>
      </div>

      <div className="reservation-info">
        <p>Rezerwacja zostanie potwierdzona w ciągu 24h od złożenia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
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
        className={`floating-menu-logo ${showFloatingMenuLogo ? 'is-visible' : ''} ${isRedMenuMode ? 'is-red' : ''}`}
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
              <div
                className="reservation-layout__top reservation-layout__top--places"
              >
                <div className="places-gallery-logo" aria-hidden="true">
                  <span className="places-gallery-logo__art" />
                </div>

                <div className="reservation-promo reservation-promo--places">
                  <h2 className="reservation-promo__title">
                    Zarezerwuj swój czas
                  </h2>
                  <p className="reservation-promo__text">
                    Wybierz daty i poczuj spokój Hommm. Nasz kalendarz pokazuje
                    aktualną dostępność apartamentów i pozwala szybko sprawdzić
                    najlepszy termin pobytu.
                  </p>
                  <p className="reservation-promo__text reservation-promo__text--secondary">
                    Zaplanuj pobyt w miejscu, gdzie natura spotyka się z
                    komfortem, a galeria od razu pokazuje rytm przestrzeni i
                    najważniejsze detale.
                  </p>
                </div>

                <div className="reservation-visual-gallery reservation-visual-gallery--places">
                  <figure className="reservation-visual-item reservation-visual-item--wide">
                    <Image
                      src="/assets/gal_00.webp"
                      alt="Zewnętrzny widok Hommm"
                      fill
                      priority
                      sizes="(max-width: 768px) 92vw, 34vw"
                    />
                  </figure>
                  <figure className="reservation-visual-item reservation-visual-item--tall reservation-visual-item--tall-left">
                    <Image
                      src="/assets/gal_01.webp"
                      alt="Wnętrze Hommm"
                      fill
                      priority
                      sizes="(max-width: 768px) 44vw, 16vw"
                    />
                  </figure>
                  <figure className="reservation-visual-item reservation-visual-item--tall reservation-visual-item--tall-right">
                    <Image
                      src="/assets/gal_02.webp"
                      alt="Łazienka Hommm"
                      fill
                      priority
                      sizes="(max-width: 768px) 44vw, 16vw"
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
                To przykładowy blok treści, który opisuje charakter miejsca i
                spokojny rytm wypoczynku. W tym obszarze możesz dodać dowolne
                informacje: koncept, wartości, klimat i doświadczenie gościa.
                Może to być miejsce na opis dnia gościa: od porannej kawy, przez
                strefę relaksu, po wieczorne chwile przy świetle. Dzięki temu
                sekcja jest pełniejsza i daje więcej kontekstu, zanim użytkownik
                przejdzie do kolejnych fragmentów strony.
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
        data-menu-font={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
      >
        {expandedSection === 'sec3' ? (
          renderExpandedContent('sec3')
        ) : (
          <div className="container story-container">
            <h2 className="h1-brand">YOUR SPECIAL PLACE</h2>
            <h3 className="heading-secondary story-subtitle">
              CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?
            </h3>

            <div className="story-text-block">
              <p>
                To przykładowy tekst do sekcji miejsca — podkreśla kameralność,
                naturę i oddech od codziennego tempa. Dodatkowe akapity mogą
                opisywać przestrzeń, udogodnienia, rytuały i to, co buduje
                wyjątkowy klimat pobytu. Możesz też dopisać informacje o
                apartamentach, prywatnych strefach i detalach, które podkreślają
                komfort pobytu. Taki rozszerzony opis pomaga lepiej wyobrazić
                sobie miejsce i zwiększa szansę, że odwiedzający kliknie dalej.
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
        className="section bg-light"
        id="sec4-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container footer-container">
          <div className="footer-brand reveal reveal--scale">
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

          <div className="footer-grid">
            <div
              className="footer-column footer-column--corporate reveal reveal--up"
              style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
            >
              <h3 className="footer-column__title">DANE KORPORACYJNE:</h3>
              <div className="footer-column__content">
                <p>Banana Gun Design Maria Budner</p>
                <p>ul. Sanocka 39 m 5</p>
                <p>93-038 Łódź</p>
                <p>NIP 7292494164</p>
              </div>
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
            src="/assets/baner.webp"
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
