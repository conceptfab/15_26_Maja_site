import { prisma } from './db';
import { jsonToRecord } from './json-utils';
import { EXPANDED_SECTION_CONTENT } from '@/data/content';

export type GalleryImageData = {
  src: string;
  altPl: string | null;
  altEn: string | null;
};

export type SectionContent = {
  slug: string;
  titlePl: string | null;
  titleEn: string | null;
  contentPl: Record<string, string>;
  contentEn: Record<string, string>;
  isVisible: boolean;
  bgImage?: string | null;
  bgColor?: string | null;
  galleryImages?: GalleryImageData[];
};

export async function getHomeContent(): Promise<SectionContent[]> {
  try {
    const sections = await prisma.section.findMany({
      where: { page: { isHome: true } },
      orderBy: { order: 'asc' },
      include: {
        galleryImages: {
          orderBy: { order: 'asc' },
          select: { webpUrl: true, altPl: true, altEn: true },
        },
      },
    });

    if (sections.length === 0) {
      return getFallbackContent();
    }

    return sections.map((s) => ({
      slug: s.slug,
      titlePl: s.titlePl,
      titleEn: s.titleEn,
      contentPl: jsonToRecord(s.contentPl),
      contentEn: jsonToRecord(s.contentEn),
      isVisible: s.isVisible,
      bgImage: s.bgImage,
      bgColor: s.bgColor,
      galleryImages: s.galleryImages.length > 0
        ? s.galleryImages.map((img) => ({
            src: img.webpUrl,
            altPl: img.altPl,
            altEn: img.altEn,
          }))
        : undefined,
    }));
  } catch {
    return getFallbackContent();
  }
}

function getFallbackContent(): SectionContent[] {
  const sec2 = EXPANDED_SECTION_CONTENT.sec2;
  const sec3 = EXPANDED_SECTION_CONTENT.sec3;

  return [
    {
      slug: 'hero',
      titlePl: 'Hero',
      titleEn: 'Hero',
      contentPl: { heading: 'YOUR SPECIAL TIME', subheading: 'HOMMM' },
      contentEn: { heading: 'YOUR SPECIAL TIME', subheading: 'HOMMM' },
      isVisible: true,
    },
    {
      slug: 'koncept',
      titlePl: 'Koncept HOMMM',
      titleEn: 'HOMMM Concept',
      contentPl: {
        heading: 'YOUR SPECIAL TIME',
        subheading: 'KONCEPT HOMMM',
        body: sec2.body.join('\n\n'),
        intro: sec2.intro,
      },
      contentEn: {
        heading: 'YOUR SPECIAL TIME',
        subheading: 'HOMMM CONCEPT',
        body: sec2.body.join('\n\n'),
        intro: sec2.intro,
      },
      isVisible: true,
    },
    {
      slug: 'miejsce',
      titlePl: 'Miejsce',
      titleEn: 'Place',
      contentPl: {
        heading: 'YOUR SPECIAL PLACE',
        subheading: 'CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?',
        body: sec3.body.join('\n\n'),
        intro: sec3.intro,
      },
      contentEn: {
        heading: 'YOUR SPECIAL PLACE',
        subheading: 'WANT TO REST IN SILENCE AND SURROUNDED BY NATURE?',
        body: sec3.body.join('\n\n'),
        intro: sec3.intro,
      },
      isVisible: true,
    },
    {
      slug: 'rezerwacja',
      titlePl: 'Rezerwacja',
      titleEn: 'Reservation',
      contentPl: {
        title: 'Zarezerwuj swój czas',
        description: 'Wybierz daty i poczuj spokój Hommm.',
        description2: 'Zaplanuj pobyt w miejscu, gdzie natura spotyka się z komfortem.',
        checkin: 'Zameldowanie', checkout: 'Wymeldowanie',
        guests_label: 'Goście', submit: 'REZERWUJ',
        note: 'Płatność nie zostanie jeszcze naliczona',
        clear: 'Wyczyść daty', info: 'Rezerwacja zostanie potwierdzona w ciągu 24h.',
        night_one: 'noc', night_few: 'noce', night_many: 'nocy',
        guest_one: 'gość', guest_few: 'gości',
      },
      contentEn: {
        title: 'Book your time',
        description: 'Choose your dates and feel the peace of Hommm.',
        description2: 'Plan your stay where nature meets comfort.',
        checkin: 'Check-in', checkout: 'Check-out',
        guests_label: 'Guests', submit: 'BOOK NOW',
        note: "You won't be charged yet",
        clear: 'Clear dates', info: 'Your reservation will be confirmed within 24 hours.',
        night_one: 'night', night_few: 'nights', night_many: 'nights',
        guest_one: 'guest', guest_few: 'guests',
      },
      isVisible: true,
    },
    {
      slug: 'kontakt',
      titlePl: 'Kontakt',
      titleEn: 'Contact',
      contentPl: {
        email: 'hommm@hommm.eu',
        phone: '+48 608 259 945',
        company: 'Banana Gun Design Maria Budner',
        address: 'ul. Sanocka 39 m 5, 93-038 Łódź',
        nip: '7292494164',
      },
      contentEn: {
        email: 'hommm@hommm.eu',
        phone: '+48 608 259 945',
        company: 'Banana Gun Design Maria Budner',
        address: 'ul. Sanocka 39 m 5, 93-038 Łódź',
        nip: '7292494164',
      },
      isVisible: true,
    },
  ];
}
