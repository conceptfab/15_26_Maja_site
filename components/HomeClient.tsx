'use client';

import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { differenceInCalendarDays, format, eachDayOfInterval } from 'date-fns';
import { sanitizeHtml } from '@/lib/sanitize';
import { Lightbox } from './Lightbox';
import { pl as plLocale } from 'date-fns/locale';
import { enUS as enLocale } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import Image from 'next/image';
import { TopMenu, type MenuColors, type MenuView } from './TopMenu';
import { ReservationModal } from './ReservationModal';
import { useLocale } from '@/lib/i18n';
import type { SectionContent } from '@/lib/content';
import type { SiteSettingsMap } from '@/actions/settings';
import {
  EraserIcon,
  MailIcon,
  PhoneIcon,
  InstagramIcon,
  TikTokIcon,
  FacebookIcon,
} from './Icons';

const BRAND_COLOR = '#be1622';
const PRICE_PER_NIGHT_FALLBACK = 204.5;
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

type ExpandableSection = 'sec2' | 'sec3';

// Galeria statyczna — fallback gdy brak zdjęć z DB
const GALLERY_FALLBACK: Record<string, { src: string; altPl: string; altEn: string }[]> = {
  sec2: [
    { src: '/assets/gal_00.webp', altPl: 'Strefa relaksu i natura', altEn: 'Relaxation zone and nature' },
    { src: '/assets/gal_01.webp', altPl: 'Widok głównej przestrzeni', altEn: 'Main space view' },
    { src: '/assets/gal_02.webp', altPl: 'Detale miejsca', altEn: 'Place details' },
  ],
  sec3: [
    { src: '/assets/gal_01.webp', altPl: 'Kadr przestrzeni pobytu', altEn: 'Stay space shot' },
    { src: '/assets/gal_00.webp', altPl: 'Strefa na zewnątrz', altEn: 'Outdoor zone' },
    { src: '/assets/gal_02.webp', altPl: 'Ujęcie klimatu miejsca', altEn: 'Place atmosphere shot' },
  ],
};

function getSectionBySlug(sections: SectionContent[], slug: string) {
  return sections.find((s) => s.slug === slug);
}

export function HomeClient({ sections: initialSections, settings }: { sections: SectionContent[]; settings: SiteSettingsMap }) {
  const { locale, t } = useLocale();
  const [liveOverrides, setLiveOverrides] = useState<Record<string, SectionContent>>({});

  const [activeView, setActiveView] = useState<MenuView>('home');

  // Obsługa URL params dla podglądu admina (?view=rezerwuj, ?expand=sec3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as MenuView | null;
    const expand = params.get('expand') as ExpandableSection | null;
    if (view) setActiveView(view);
    if (expand) setExpandedSection(expand);
  }, []);

  // Live preview: admin edytor wysyła zmiany przez postMessage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Akceptuj wyłącznie wiadomości z tego samego origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'cms-expand-section') {
        setExpandedSection(event.data.section as ExpandableSection | null);
        return;
      }
      if (event.data?.type === 'cms-set-view') {
        setActiveView(event.data.view as MenuView);
        return;
      }
      if (event.data?.type === 'cms-live-preview' && event.data.slug) {
        const { slug, contentPl, contentEn, titlePl, titleEn, bgImage, bgColor } = event.data;
        setLiveOverrides((prev) => ({
          ...prev,
          [slug]: {
            ...prev[slug],
            slug,
            titlePl: titlePl ?? null,
            titleEn: titleEn ?? null,
            contentPl: contentPl ?? {},
            contentEn: contentEn ?? {},
            bgImage: bgImage ?? prev[slug]?.bgImage ?? null,
            bgColor: bgColor ?? prev[slug]?.bgColor ?? null,
            isVisible: true,
          },
        }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Merge: dane z DB nadpisane live overrides (zachowaj galleryImages z DB)
  const sections = initialSections.map((s) =>
    liveOverrides[s.slug] ? { ...s, ...liveOverrides[s.slug] } : s
  );
  const [hasScrolled, setHasScrolled] = useState(false);
  const [expandedSection, setExpandedSection] =
    useState<ExpandableSection | null>(null);
  const [lightboxSection, setLightboxSection] = useState<ExpandableSection | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reservationRange, setReservationRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [reservationGuests, setReservationGuests] = useState('1');
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
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
  const pricePerNight = settings.pricePerNight ?? PRICE_PER_NIGHT_FALLBACK;
  const totalPrice = Math.round(nights * pricePerNight);
  const dateLocale = locale === 'pl' ? plLocale : enLocale;
  const checkInLabel = checkIn
    ? format(checkIn, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';
  const checkOutLabel = checkOut
    ? format(checkOut, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';
  const today = new Date();

  // Helper: pobierz treść wg języka
  const c = (section: SectionContent | undefined, field: string): string => {
    if (!section) return '';
    const content = locale === 'pl' ? section.contentPl : section.contentEn;
    return content[field] ?? '';
  };

  const heroSection = getSectionBySlug(sections, 'hero');
  const konceptSection = getSectionBySlug(sections, 'koncept');
  const miejsceSection = getSectionBySlug(sections, 'miejsce');
  const rezerwacjaSection = getSectionBySlug(sections, 'rezerwacja');
  const menuSection = getSectionBySlug(sections, 'menu');
  const stopkaSection = getSectionBySlug(sections, 'stopka');

  const bgStyle = (section: SectionContent | undefined): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (section?.bgImage) {
      (style as Record<string, string>)['--section-bg'] = `url(${section.bgImage})`;
    }
    if (section?.bgColor) style.backgroundColor = section.bgColor;
    return style;
  };

  // Shortcut for reservation texts — DB first, i18n fallback
  const r = (field: string): string => {
    const fromDb = c(rezerwacjaSection, field);
    return fromDb || t(`reservation.${field}`);
  };

  // Widok MIEJSCA — tytuł/opisy z sekcji 'miejsce' (nowe pola), fallback do rezerwacja
  const mw = (field: string): string =>
    c(miejsceSection, `miejsca_${field}`) || c(rezerwacjaSection, field) || t(`reservation.${field}`);

  const getNightLabel = (n: number) => {
    if (n === 1) return r('night_one');
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return r('night_few');
    }
    return r('night_many');
  };

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

  // Pobierz zajęte daty z API
  const fetchAvailability = useCallback(() => {
    fetch('/api/reservations/availability')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const dates: Date[] = [];
        // Rezerwacje — rozwiń zakresy do pojedynczych dat
        for (const r of data.reservations) {
          const start = new Date(r.checkIn);
          const end = new Date(r.checkOut);
          if (start < end) {
            eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) })
              .forEach((d) => dates.push(d));
          }
        }
        // Zablokowane daty
        for (const b of data.blockedDates) {
          dates.push(new Date(b.date));
        }
        setUnavailableDates(dates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isReservationView) {
      fetchAvailability();
    }
  }, [isReservationView, fetchAvailability]);

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
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const hasReservationDates = reservationRange[0] !== null;

        setHasScrolled(currentScrollY > SCROLL_COMPACT_THRESHOLD);

        if (activeView !== 'home' && !navGuardRef.current) {
          const isScrollingDown = currentScrollY > lastScrollYRef.current;

          if (isReservationView) {
            if (!hasReservationDates) {
              const heroSec = document.getElementById('hero-start');
              if (
                heroSec &&
                isScrollingDown &&
                currentScrollY > SCROLL_COMPACT_THRESHOLD &&
                heroSec.getBoundingClientRect().bottom <= 0
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

        if (expandedSection && isMobileRef.current) {
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
    if (!elements.length) return;

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
    if (!expandedSection || isMobileRef.current) return;

    const hideExpandedSection = () => setExpandedSection(null);
    const onWheel = () => hideExpandedSection();
    const onTouchMove = () => hideExpandedSection();
    const onKeyDown = (event: KeyboardEvent) => {
      if (DISMISS_KEYS.has(event.key)) hideExpandedSection();
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

  const handlePlacesLogoMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (isMobileRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty('--places-logo-mouse-x', offsetX.toFixed(3));
    event.currentTarget.style.setProperty('--places-logo-mouse-y', offsetY.toFixed(3));
  };

  const handlePlacesLogoMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--places-logo-mouse-x', '0');
    event.currentTarget.style.setProperty('--places-logo-mouse-y', '0');
  };

  const handleReservationSubmit = () => {
    if (!checkIn || !checkOut) return;
    setReservationModalOpen(true);
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
        <div className="reservation-system__calendar-col reservation-system__calendar-col--wide">
          <DatePicker
            selected={today}
            onChange={(update) => setReservationRange(update)}
            startDate={checkIn}
            endDate={checkOut}
            selectsRange
            inline
            monthsShown={2}
            locale={dateLocale}
            minDate={today}
            openToDate={today}
            formatWeekDay={(dayName) =>
              dayName.replace('.', '').slice(0, 3).toLowerCase()
            }
            calendarClassName="reservation-datepicker"
            fixedHeight
            excludeDates={unavailableDates}
            renderCustomHeader={({
              monthDate,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              customHeaderCount,
            }) => (
              <div className="reservation-datepicker__header">
                {customHeaderCount === 0 && (
                  <button
                    type="button"
                    className="reservation-datepicker__nav reservation-datepicker__nav--prev"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    aria-label="Poprzedni miesiąc"
                  >
                    &#x276E;
                  </button>
                )}
                <span className="reservation-datepicker__month-name">
                  {monthDate.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                {customHeaderCount === 1 && (
                  <button
                    type="button"
                    className="reservation-datepicker__nav reservation-datepicker__nav--next"
                    onClick={increaseMonth}
                    aria-label="Następny miesiąc"
                  >
                    &#x276F;
                  </button>
                )}
              </div>
            )}
          />
        </div>

        <aside
          className="reservation-summary-card"
          aria-label={mw('title')}
        >
          <p className="reservation-summary-card__price">
            <span>{totalPrice} zl</span> za {nights} {getNightLabel(nights)}
          </p>

          <div className="reservation-summary-card__fields">
            <div className="reservation-summary-card__dates">
              <div className="reservation-summary-card__date-box">
                <span>{r('checkin')}</span>
                <strong>{checkInLabel}</strong>
              </div>
              <div className="reservation-summary-card__date-box">
                <span>{r('checkout')}</span>
                <strong>{checkOutLabel}</strong>
              </div>
            </div>

            <label className="reservation-summary-card__guests">
              <span>{r('guests_label')}</span>
              <select
                name="guests"
                value={reservationGuests}
                onChange={(event) => setReservationGuests(event.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? r('guest_one') : r('guest_few')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="reservation-summary-card__submit"
            onClick={handleReservationSubmit}
            disabled={!checkIn || !checkOut}
          >
            {r('submit')}
          </button>

          <p className="reservation-summary-card__note">
            {r('note')}
          </p>
        </aside>

        <button
          type="button"
          className="reservation-system__clear"
          onClick={handleReservationClear}
          style={{ justifySelf: 'end' }}
        >
          <EraserIcon />
          <span>{r('clear')}</span>
        </button>
      </div>

      <div className="reservation-info"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(r('info')) }}
      />
    </div>
  );

  const renderExpandedContent = (section: ExpandableSection) => {
    const dbSection = section === 'sec2' ? konceptSection : miejsceSection;
    const dbGallery = dbSection?.galleryImages;
    const gallery = dbGallery && dbGallery.length > 0
      ? dbGallery
      : GALLERY_FALLBACK[section] || [];
    const heading = c(dbSection, 'heading') || (section === 'sec2' ? 'KONCEPT HOMMM' : 'YOUR SPECIAL PLACE');
    const intro = c(dbSection, 'intro');
    const body = c(dbSection, 'body');

    const openLightbox = (index: number) => {
      setLightboxSection(section);
      setLightboxIndex(index);
    };

    return (
      <div className="container container-white expanded-content-container">
        <div className="expanded-content-grid">
          <div className="expanded-content-copy-col">
            <h2 className="heading-secondary">{heading}</h2>
            {intro && (
              <div
                className="expanded-content-intro"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(intro) }}
              />
            )}
            {body && (
              <div
                className="expanded-content-body"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
              />
            )}
          </div>

          <aside
            className="expanded-content-gallery-col"
            aria-label="Galeria miejsca"
          >
            {gallery.map((image, index) => (
              <figure
                className="expanded-content-gallery-item expanded-content-gallery-item--clickable"
                key={`${image.src}-${index}`}
                onClick={() => openLightbox(index)}
                title="Powiększ"
              >
                <Image
                  src={image.src}
                  alt={locale === 'pl' ? (image.altPl || '') : (image.altEn || '')}
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
        menuLabels={menuSection ? (locale === 'pl' ? menuSection.contentPl : menuSection.contentEn) : undefined}
      />

      <div
        className={`floating-menu-logo ${showFloatingMenuLogo ? 'is-visible' : ''} ${isRedMenuMode ? 'is-red' : ''}`}
      >
        <a
          className="floating-menu-logo__link"
          href="#hero-start"
          aria-label={t('footer.backToTop')}
          onClick={handleFloatingLogoClick}
        >
          <span className="floating-menu-logo__mark" />
        </a>
      </div>

      <section
        className="section h-100vh bg-slider"
        id="hero-start"
        style={bgStyle(heroSection)}
        data-menu-font={isReservationView ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={isReservationView ? BRAND_COLOR : '#ffffff'}
      >
        {isReservationView ? (
          <div
            className={`container container-white reservation-layout ${showReservationGallery ? '' : 'reservation-layout--panel-only'}`}
            aria-label={mw('title')}
          >
            {showReservationGallery ? (
              <div className="reservation-layout__top reservation-layout__top--places">
                <div className="places-gallery-logo" aria-hidden="true">
                  <span className="places-gallery-logo__art" />
                </div>

                <div className="reservation-promo reservation-promo--places">
                  <h2 className="reservation-promo__title">
                    {mw('title')}
                  </h2>
                  <div className="reservation-promo__text"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(mw('description')) }}
                  />
                  <div className="reservation-promo__text reservation-promo__text--secondary"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(mw('description2')) }}
                  />
                </div>

                <div className="reservation-visual-gallery reservation-visual-gallery--places">
                  {(() => {
                    const dbGal = miejsceSection?.galleryImages;
                    const gal = (dbGal && dbGal.length > 0) ? dbGal : GALLERY_FALLBACK.sec3;
                    const imgs = [gal[0], gal[1], gal[2]].filter(Boolean);
                    const cls = ['reservation-visual-item--wide', 'reservation-visual-item--tall reservation-visual-item--tall-left', 'reservation-visual-item--tall reservation-visual-item--tall-right'];
                    return imgs.map((img, i) => (
                      <figure key={img.src} className={`reservation-visual-item ${cls[i] ?? ''}`}>
                        <Image
                          src={img.src}
                          alt={locale === 'pl' ? (img.altPl || '') : (img.altEn || '')}
                          fill
                          priority
                          sizes="(max-width: 768px) 92vw, 34vw"
                        />
                      </figure>
                    ));
                  })()}
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
        style={bgStyle(konceptSection)}
        data-menu-font={expandedSection === 'sec2' ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={expandedSection === 'sec2' ? BRAND_COLOR : '#ffffff'}
      >
        {expandedSection === 'sec2' ? (
          renderExpandedContent('sec2')
        ) : (
          <div className="container story-container">
            <h1 className="h1-brand">{c(konceptSection, 'heading') || 'YOUR SPECIAL TIME'}</h1>
            <h2 className="heading-secondary story-subtitle">
              {c(konceptSection, 'subheading') || 'KONCEPT HOMMM'}
            </h2>

            <div
              className="story-text-block"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c(konceptSection, 'body') || '') }}
            />

            <button
              type="button"
              className="story-read-more"
              onClick={() => handleReadMoreClick('sec2')}
            >
              {t('section.readMore')}
            </button>
          </div>
        )}
      </section>

      <section
        className={`section h-100vh bg-dark ${expandedSection === 'sec3' ? '' : 'section-story'}`}
        id="sec3-wrapper"
        style={bgStyle(miejsceSection)}
        data-menu-font={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={expandedSection === 'sec3' ? BRAND_COLOR : '#ffffff'}
      >
        {expandedSection === 'sec3' ? (
          renderExpandedContent('sec3')
        ) : (
          <div className="container story-container">
            <h2 className="h1-brand">{c(miejsceSection, 'heading') || 'YOUR SPECIAL PLACE'}</h2>
            <h3 className="heading-secondary story-subtitle">
              {c(miejsceSection, 'subheading') || ''}
            </h3>

            <div
              className="story-text-block"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c(miejsceSection, 'body') || '') }}
            />

            <button
              type="button"
              className="story-read-more"
              onClick={() => handleReadMoreClick('sec3')}
            >
              {t('section.readMore')}
            </button>
          </div>
        )}
      </section>

      <section
        className="section bg-light"
        id="sec4-wrapper"
        style={bgStyle(stopkaSection)}
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
                {c(stopkaSection, 'koncept_label') || t('menu.koncept').toUpperCase()}
              </a>

              <button
                type="button"
                className="footer-nav-link"
                onClick={() => {
                  navigateTo('miejsca');
                  scrollToHeroStart();
                }}
              >
                {c(stopkaSection, 'miejsca_label') || t('menu.miejsca').toUpperCase()}
              </button>

              <button
                type="button"
                className="footer-nav-link"
                onClick={() => {
                  navigateTo('rezerwuj');
                  scrollToHeroStart();
                }}
              >
                {c(stopkaSection, 'rezerwuj_label') || t('menu.rezerwuj').toUpperCase()}
              </button>
            </div>
          </div>

          <div className="footer-grid">
            <div
              className="footer-column footer-column--corporate reveal reveal--up"
              style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
            >
              <h3 className="footer-column__title">{c(stopkaSection, 'corporate_title') || t('footer.corporate')}</h3>
              <div className="footer-column__content">
                <p>{settings.companyName}</p>
                <p>{settings.companyAddress}</p>
                <p>NIP {settings.companyNip}</p>
              </div>
            </div>

            <div
              className="footer-column footer-column--contact reveal reveal--up"
              style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
            >
              <h3 className="footer-column__title">{c(stopkaSection, 'contact_title') || t('footer.contact')}</h3>
              <div className="footer-column__content footer-contact">
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="footer-contact__link"
                >
                  <MailIcon />
                  <span>{settings.contactEmail}</span>
                </a>

                <a href={`tel:${settings.contactPhone}`} className="footer-contact__link">
                  <PhoneIcon />
                  <span>{settings.contactPhone.replace('+48 ', '')}</span>
                </a>

                <div className="footer-socials">
                  {settings.socialInstagram && (
                    <a
                      href={settings.socialInstagram}
                      aria-label="Instagram"
                      className="footer-socials__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InstagramIcon />
                      <span>Instagram</span>
                    </a>
                  )}
                  {settings.socialTiktok && (
                    <a
                      href={settings.socialTiktok}
                      aria-label="TikTok"
                      className="footer-socials__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TikTokIcon />
                      <span>TikTok</span>
                    </a>
                  )}
                  {settings.socialFacebook && (
                    <a
                      href={settings.socialFacebook}
                      aria-label="Facebook"
                      className="footer-socials__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FacebookIcon />
                      <span>Facebook</span>
                    </a>
                  )}
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

      {lightboxSection && (() => {
        const dbSection = lightboxSection === 'sec2' ? konceptSection : miejsceSection;
        const gallery = (dbSection?.galleryImages && dbSection.galleryImages.length > 0)
          ? dbSection.galleryImages
          : GALLERY_FALLBACK[lightboxSection] || [];
        return (
          <Lightbox
            images={gallery}
            startIndex={lightboxIndex}
            open={true}
            locale={locale}
            onClose={() => setLightboxSection(null)}
            onNavigate={setLightboxIndex}
          />
        );
      })()}

      {checkIn && checkOut && (
        <ReservationModal
          open={reservationModalOpen}
          onOpenChange={(open) => {
            setReservationModalOpen(open);
            if (!open) fetchAvailability();
          }}
          checkIn={checkIn}
          checkOut={checkOut}
          checkInLabel={checkInLabel}
          checkOutLabel={checkOutLabel}
          nights={nights}
          guests={reservationGuests}
          totalPrice={totalPrice}
          nightLabel={getNightLabel(nights)}
        />
      )}
    </>
  );
}
