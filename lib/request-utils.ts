/** Wyodrębnia IP klienta z nagłówków HTTP */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown'
  );
}
