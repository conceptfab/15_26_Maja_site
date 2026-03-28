import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'a', 'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li',
  'blockquote', 'code',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: false,
  });
}

/** Czy wartość wygląda jak HTML (zawiera tagi)? */
export function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
