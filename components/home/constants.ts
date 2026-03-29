import type { SectionContent } from '@/lib/content';

export const BRAND_COLOR = '#be1622';
export const SCROLL_COMPACT_THRESHOLD = 10;
export const DISMISS_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
]);

export type ExpandableSection = 'sec2' | 'sec3';

export const GALLERY_FALLBACK: Record<string, { src: string; altPl: string; altEn: string }[]> = {
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

export function getSectionBySlug(sections: SectionContent[], slug: string) {
  return sections.find((s) => s.slug === slug);
}

export function getGalleryWithFallback(sectionData: SectionContent | undefined, fallbackKey: string) {
  const dbGallery = sectionData?.galleryImages;
  return dbGallery && dbGallery.length > 0 ? dbGallery : GALLERY_FALLBACK[fallbackKey] || [];
}
