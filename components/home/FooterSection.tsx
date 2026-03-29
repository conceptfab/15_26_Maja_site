'use client';

import Image from 'next/image';
import type { MouseEvent } from 'react';
import { SectionBg } from '../SectionBg';
import type { SectionContent } from '@/lib/content';
import type { SiteSettingsMap } from '@/actions/settings';
import {
  MailIcon,
  PhoneIcon,
  InstagramIcon,
  TikTokIcon,
  FacebookIcon,
} from '../Icons';

interface FooterSectionProps {
  settings: SiteSettingsMap;
  stopkaSection: SectionContent | undefined;
  locale: string;
  c: (section: SectionContent | undefined, field: string) => string;
  t: (key: string) => string;
  onLogoClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onNavigatePlaces: () => void;
  onNavigateReservation: () => void;
  bgStyle: React.CSSProperties;
}

export function FooterSection({
  settings,
  stopkaSection,
  locale,
  c,
  t,
  onLogoClick,
  onNavigatePlaces,
  onNavigateReservation,
  bgStyle,
}: FooterSectionProps) {
  const handleFooterNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="section bg-light relative"
      id="kontakt"
      style={bgStyle}
      data-menu-font="#ffffff"
      data-menu-logo="#ffffff"
    >
      <SectionBg src={stopkaSection?.bgImage || '/assets/footer.webp'} />
      <div className="container footer-container">
        <div className="footer-brand reveal reveal--scale">
          <a
            href="#rezerwuj"
            onClick={onLogoClick}
            className="footer-logo-link"
          >
            <img
              src="/assets/hommm.svg"
              alt="HOMMM"
              className="footer-logo"
              width={168}
              height={119}
            />
          </a>

          <div className="footer-nav-group">
            <a
              href="#koncept"
              className="footer-nav-link"
              onClick={(event) => handleFooterNavClick(event, 'koncept')}
            >
              {c(stopkaSection, 'koncept_label') || t('menu.koncept').toUpperCase()}
            </a>

            <button
              type="button"
              className="footer-nav-link"
              onClick={onNavigatePlaces}
            >
              {c(stopkaSection, 'miejsca_label') || t('menu.miejsca').toUpperCase()}
            </button>

            <button
              type="button"
              className="footer-nav-link"
              onClick={onNavigateReservation}
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
          alt="Baner — Krajowy Plan Odbudowy, Rzeczpospolita Polska, NextGenerationEU"
          width={2880}
          height={150}
          className="footer-banner__img"
        />
      </div>
    </section>
  );
}
