'use client';

import { useEffect, useRef, useState, useCallback, useMemo, type MouseEvent } from 'react';
import { differenceInCalendarDays, format, eachDayOfInterval } from 'date-fns';
import { calculatePrice, type PricingRuleRange } from '@/lib/pricing';
const Lightbox = dynamic(() => import('./Lightbox').then((m) => ({ default: m.Lightbox })), { ssr: false });
import { pl as plLocale } from 'date-fns/locale';
import { enUS as enLocale } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { SectionBg } from './SectionBg';
import { TopMenu, type MenuColors, type MenuView } from './TopMenu';
import { ReservationModal } from './ReservationModal';
import { useLocale } from '@/lib/i18n';
import type { SectionContent } from '@/lib/content';
import type { SiteSettingsMap } from '@/actions/settings';

import {
  BRAND_COLOR,
  SCROLL_COMPACT_THRESHOLD,
  DISMISS_KEYS,
  getSectionBySlug,
  getGalleryWithFallback,
  type ExpandableSection,
} from './home/constants';
import { ReservationSystem } from './home/ReservationSystem';
import { StorySection } from './home/StorySection';
import { FooterSection } from './home/FooterSection';

export function HomeClient({ sections: initialSections, settings, pricingRules = [] }: { sections: SectionContent[]; settings: SiteSettingsMap; pricingRules?: PricingRuleRange[] }) {
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

  const sections = useMemo(() =>
    initialSections.map((s) =>
      liveOverrides[s.slug] ? { ...s, ...liveOverrides[s.slug] } : s
    ),
  [initialSections, liveOverrides]);

  const memoSanitize = useCallback((html: string) => html || '', []);

  const [hasScrolled, setHasScrolled] = useState(false);
  const [expandedSection, setExpandedSection] =
    useState<ExpandableSection | null>(null);
  const [lightboxSection, setLightboxSection] = useState<ExpandableSection | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reservationRange, setReservationRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const reservationRangeRef = useRef(reservationRange);
  reservationRangeRef.current = reservationRange;
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
  const priceResult = checkIn && checkOut && nights > 0
    ? calculatePrice(checkIn, checkOut, settings, pricingRules)
    : null;
  const totalPrice = priceResult?.totalPrice ?? 0;
  const dateLocale = locale === 'pl' ? plLocale : enLocale;
  const checkInLabel = checkIn
    ? format(checkIn, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';
  const checkOutLabel = checkOut
    ? format(checkOut, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';
  const today = useMemo(() => new Date(), []);

  const c = useCallback((section: SectionContent | undefined, field: string): string => {
    if (!section) return '';
    const content = locale === 'pl' ? section.contentPl : section.contentEn;
    return content[field] ?? '';
  }, [locale]);

  const { heroSection, konceptSection, miejsceSection, rezerwacjaSection, menuSection, stopkaSection } = useMemo(() => ({
    heroSection: getSectionBySlug(sections, 'hero'),
    konceptSection: getSectionBySlug(sections, 'koncept'),
    miejsceSection: getSectionBySlug(sections, 'miejsce'),
    rezerwacjaSection: getSectionBySlug(sections, 'rezerwacja'),
    menuSection: getSectionBySlug(sections, 'menu'),
    stopkaSection: getSectionBySlug(sections, 'stopka'),
  }), [sections]);

  const bgStyle = (section: SectionContent | undefined): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (section?.bgColor) style.backgroundColor = section.bgColor;
    return style;
  };

  const r = useCallback((field: string): string => {
    const fromDb = c(rezerwacjaSection, field);
    return fromDb || t(`reservation.${field}`);
  }, [c, rezerwacjaSection, t]);

  const mw = useCallback((field: string): string =>
    c(miejsceSection, `miejsca_${field}`) || c(rezerwacjaSection, field) || t(`reservation.${field}`),
  [c, miejsceSection, rezerwacjaSection, t]);

  const getNightLabel = useCallback((n: number) => {
    if (n === 1) return r('night_one');
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return r('night_few');
    }
    return r('night_many');
  }, [r]);

  const scrollToHeroStart = () => {
    document
      .getElementById('rezerwuj')
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

  const fetchAvailability = useCallback(() => {
    fetch('/api/reservations/availability')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const dates: Date[] = [];
        for (const r of data.reservations) {
          const start = new Date(r.checkIn);
          const end = new Date(r.checkOut);
          if (start < end) {
            eachDayOfInterval({ start, end })
              .forEach((d) => dates.push(d));
          }
        }
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
        const hasReservationDates = reservationRangeRef.current[0] !== null;

        const shouldBeScrolled = currentScrollY > SCROLL_COMPACT_THRESHOLD;
        setHasScrolled((prev) => prev === shouldBeScrolled ? prev : shouldBeScrolled);

        if (activeView !== 'home' && !navGuardRef.current) {
          const isScrollingDown = currentScrollY > lastScrollYRef.current;

          if (isReservationView) {
            if (!hasReservationDates) {
              const heroSec = document.getElementById('rezerwuj');
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
            const sec2 = document.getElementById('koncept');
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
            expandedSection === 'sec2' ? 'koncept' : 'miejsca';
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
  }, [activeView, expandedSection, isReservationView]);

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
    const targetId = section === 'sec2' ? 'koncept' : 'miejsca';
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenLightbox = (section: ExpandableSection, index: number) => {
    setLightboxSection(section);
    setLightboxIndex(index);
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
          href="#rezerwuj"
          aria-label={t('footer.backToTop')}
          onClick={handleFloatingLogoClick}
        >
          <span className="floating-menu-logo__mark" />
        </a>
      </div>

      <section
        className="section h-100vh bg-slider relative"
        id="rezerwuj"
        style={bgStyle(heroSection)}
        data-menu-font={isReservationView ? BRAND_COLOR : '#ffffff'}
        data-menu-logo={isReservationView ? BRAND_COLOR : '#ffffff'}
      >
        <SectionBg
          src={heroSection?.bgImage || '/assets/hero.webp'}
          objectPosition="center 70%"
          priority
        />
        {isReservationView ? (
          <div
            className={`container container-white reservation-layout relative z-10 ${showReservationGallery ? '' : 'reservation-layout--panel-only'}`}
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
                    dangerouslySetInnerHTML={{ __html: memoSanitize(mw('description')) }}
                  />
                  <div className="reservation-promo__text reservation-promo__text--secondary"
                    dangerouslySetInnerHTML={{ __html: memoSanitize(mw('description2')) }}
                  />
                </div>

                <div className="reservation-visual-gallery reservation-visual-gallery--places">
                  {(() => {
                    const gal = getGalleryWithFallback(miejsceSection, 'sec3');
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

            <ReservationSystem
              checkIn={checkIn}
              checkOut={checkOut}
              today={today}
              dateLocale={dateLocale}
              locale={locale}
              unavailableDates={unavailableDates}
              onDateRangeChange={setReservationRange}
              reservationGuests={reservationGuests}
              onGuestsChange={setReservationGuests}
              totalPrice={totalPrice}
              nights={nights}
              getNightLabel={getNightLabel}
              showGallery={showReservationGallery}
              onSubmit={() => { if (checkIn && checkOut) setReservationModalOpen(true); }}
              onClear={() => setReservationRange([null, null])}
              r={r}
              mw={mw}
              t={t}
              sanitize={memoSanitize}
            />
          </div>
        ) : (
          <div
            className={`hero-logo-stage relative z-10 ${hasScrolled ? 'is-scrolled' : ''}`}
            aria-hidden="true"
          >
            <img src="/assets/hommm.svg" alt="" className="hero-logo-main" />
          </div>
        )}
      </section>

      <StorySection
        id="koncept"
        sectionKey="sec2"
        sectionData={konceptSection}
        bgClass="section-bg-secondary"
        defaultBg="/assets/sec_2.webp"
        defaultHeading="YOUR SPECIAL TIME"
        defaultSubheading="KONCEPT HOMMM"
        headingLevel={1}
        expandedSection={expandedSection}
        locale={locale}
        c={c}
        sanitize={memoSanitize}
        t={t}
        onReadMore={handleReadMoreClick}
        onOpenLightbox={handleOpenLightbox}
        bgStyle={bgStyle(konceptSection)}
      />

      <StorySection
        id="miejsca"
        sectionKey="sec3"
        sectionData={miejsceSection}
        bgClass="bg-dark"
        defaultBg="/assets/sec_3.webp"
        defaultHeading="YOUR SPECIAL PLACE"
        defaultSubheading=""
        headingLevel={2}
        expandedSection={expandedSection}
        locale={locale}
        c={c}
        sanitize={memoSanitize}
        t={t}
        onReadMore={handleReadMoreClick}
        onOpenLightbox={handleOpenLightbox}
        bgStyle={bgStyle(miejsceSection)}
      />

      <FooterSection
        settings={settings}
        stopkaSection={stopkaSection}
        locale={locale}
        c={c}
        t={t}
        onLogoClick={handleFloatingLogoClick}
        onNavigatePlaces={() => { navigateTo('miejsca'); scrollToHeroStart(); }}
        onNavigateReservation={() => { navigateTo('rezerwuj'); scrollToHeroStart(); }}
        bgStyle={bgStyle(stopkaSection)}
      />

      {lightboxSection && (() => {
        const sectionData = lightboxSection === 'sec2' ? konceptSection : miejsceSection;
        const gallery = getGalleryWithFallback(sectionData, lightboxSection);
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
          depositAmount={priceResult?.depositAmount ?? 0}
          nightLabel={getNightLabel(nights)}
        />
      )}
    </>
  );
}
