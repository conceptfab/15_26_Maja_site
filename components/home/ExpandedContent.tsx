'use client';

import Image from 'next/image';
import type { SectionContent } from '@/lib/content';
import type { ExpandableSection } from './constants';
import { getGalleryWithFallback } from './constants';

interface ExpandedContentProps {
  section: ExpandableSection;
  sectionData: SectionContent | undefined;
  locale: string;
  c: (section: SectionContent | undefined, field: string) => string;
  sanitize: (html: string) => string;
  onOpenLightbox: (section: ExpandableSection, index: number) => void;
}

export function ExpandedContent({
  section,
  sectionData,
  locale,
  c,
  sanitize,
  onOpenLightbox,
}: ExpandedContentProps) {
  const gallery = getGalleryWithFallback(sectionData, section);
  const heading = c(sectionData, 'heading') || (section === 'sec2' ? 'KONCEPT HOMMM' : 'YOUR SPECIAL PLACE');
  const intro = c(sectionData, 'intro');
  const body = c(sectionData, 'body');

  return (
    <div className="container container-white expanded-content-container relative z-10">
      <div className="expanded-content-grid">
        <div className="expanded-content-copy-col">
          <h2 className="heading-secondary">{heading}</h2>
          {intro && (
            <div
              className="expanded-content-intro"
              dangerouslySetInnerHTML={{ __html: sanitize(intro) }}
            />
          )}
          {body && (
            <div
              className="expanded-content-body"
              dangerouslySetInnerHTML={{ __html: sanitize(body) }}
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
              onClick={() => onOpenLightbox(section, index)}
              title="Powiększ"
            >
              <Image
                src={image.thumbSrc || image.src}
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
}
