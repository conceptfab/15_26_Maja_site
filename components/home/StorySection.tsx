'use client';

import { SectionBg } from '../SectionBg';
import type { SectionContent } from '@/lib/content';
import { ExpandedContent } from './ExpandedContent';
import { BRAND_COLOR, type ExpandableSection } from './constants';

interface StorySectionProps {
  id: string;
  sectionKey: ExpandableSection;
  sectionData: SectionContent | undefined;
  bgClass: string;
  defaultBg: string;
  defaultHeading: string;
  defaultSubheading: string;
  headingLevel: 1 | 2;
  expandedSection: ExpandableSection | null;
  locale: string;
  c: (section: SectionContent | undefined, field: string) => string;
  sanitize: (html: string) => string;
  t: (key: string) => string;
  onReadMore: (section: ExpandableSection) => void;
  onOpenLightbox: (section: ExpandableSection, index: number) => void;
  bgStyle: React.CSSProperties;
}

export function StorySection({
  id,
  sectionKey,
  sectionData,
  bgClass,
  defaultBg,
  defaultHeading,
  defaultSubheading,
  headingLevel,
  expandedSection,
  locale,
  c,
  sanitize,
  t,
  onReadMore,
  onOpenLightbox,
  bgStyle,
}: StorySectionProps) {
  const isExpanded = expandedSection === sectionKey;
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const SubHeading = headingLevel === 1 ? 'h2' : 'h3';

  return (
    <section
      className={`section h-100vh ${bgClass} relative ${isExpanded ? '' : 'section-story'}`}
      id={id}
      style={bgStyle}
      data-menu-font={isExpanded ? BRAND_COLOR : '#ffffff'}
      data-menu-logo={isExpanded ? BRAND_COLOR : '#ffffff'}
    >
      <SectionBg src={sectionData?.bgImage || defaultBg} />
      {isExpanded ? (
        <ExpandedContent
          section={sectionKey}
          sectionData={sectionData}
          locale={locale}
          c={c}
          sanitize={sanitize}
          onOpenLightbox={onOpenLightbox}
        />
      ) : (
        <div className="container story-container relative z-10">
          <Heading className="h1-brand">
            {c(sectionData, 'heading') || defaultHeading}
          </Heading>
          <SubHeading className="heading-secondary story-subtitle">
            {c(sectionData, 'subheading') || defaultSubheading}
          </SubHeading>

          <div
            className="story-text-block"
            dangerouslySetInnerHTML={{ __html: sanitize(c(sectionData, 'body') || '') }}
          />

          <button
            type="button"
            className="story-read-more"
            onClick={() => onReadMore(sectionKey)}
          >
            {t('section.readMore')}
          </button>
        </div>
      )}
    </section>
  );
}
