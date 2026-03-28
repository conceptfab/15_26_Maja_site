'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { GalleryImageData } from '@/lib/content';

type Props = {
  images: GalleryImageData[];
  startIndex: number;
  open: boolean;
  locale: 'pl' | 'en';
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function Lightbox({ images, startIndex, open, locale, onClose, onNavigate }: Props) {
  const current = images[startIndex];
  const total = images.length;

  const gotoPrev = useCallback(() => {
    if (startIndex > 0) onNavigate(startIndex - 1);
  }, [startIndex, onNavigate]);

  const gotoNext = useCallback(() => {
    if (startIndex < total - 1) onNavigate(startIndex + 1);
  }, [startIndex, total, onNavigate]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') gotoPrev();
      if (e.key === 'ArrowRight') gotoNext();
    };

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, gotoPrev, gotoNext]);

  if (!open || !current) return null;

  const alt = locale === 'pl' ? (current.altPl || '') : (current.altEn || '');
  const caption = locale === 'pl' ? current.captionPl : current.captionEn;

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Lightbox"
    >
      <button
        className="lightbox-close"
        onClick={onClose}
        aria-label="Zamknij"
        type="button"
      >
        ✕
      </button>

      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lightbox-image-wrap">
          <Image
            src={current.src}
            alt={alt}
            fill
            className="lightbox-image"
            sizes="(max-width: 768px) 100vw, 90vw"
            priority
          />
        </div>

        {caption && (
          <p className="lightbox-caption">{caption}</p>
        )}

        <div className="lightbox-counter">
          {startIndex + 1} / {total}
        </div>
      </div>

      {startIndex > 0 && (
        <button
          className="lightbox-nav lightbox-nav--prev"
          onClick={(e) => { e.stopPropagation(); gotoPrev(); }}
          aria-label="Poprzednie zdjęcie"
          type="button"
        >
          &#x276E;
        </button>
      )}

      {startIndex < total - 1 && (
        <button
          className="lightbox-nav lightbox-nav--next"
          onClick={(e) => { e.stopPropagation(); gotoNext(); }}
          aria-label="Następne zdjęcie"
          type="button"
        >
          &#x276F;
        </button>
      )}
    </div>
  );
}
