import sanitize from 'sanitize-html';

const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'a', 'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li',
  'blockquote', 'code',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  });
}

/** Czy wartość wygląda jak HTML (zawiera tagi)? */
export function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
