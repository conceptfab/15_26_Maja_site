export function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(amount);
}

export function parseTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try { return JSON.parse(json) as string[]; } catch { return []; }
}
