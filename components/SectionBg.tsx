import Image from 'next/image';

type SectionBgProps = {
  src: string;
  objectPosition?: string;
  priority?: boolean;
};

/**
 * Responsive background image via next/image fill.
 * Replaces CSS background-image to enable AVIF/WebP auto-format, responsive sizing, and LCP optimization.
 */
export function SectionBg({ src, objectPosition = 'center', priority = false }: SectionBgProps) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="100vw"
      priority={priority}
      className="pointer-events-none object-cover"
      style={{ objectPosition }}
    />
  );
}
