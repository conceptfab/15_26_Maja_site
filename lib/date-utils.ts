import { differenceInCalendarDays, format } from 'date-fns';

/**
 * Oblicza liczbę nocy z rezerwacji przypadających na dany zakres dat.
 */
/** Data jako YYYY-MM-DD (do zapytań, porównań) */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Data czytelna dla użytkownika: dd.MM.yyyy */
export function toDisplayDate(date: Date): string {
  return format(date, 'dd.MM.yyyy');
}

export function overlapNights(checkIn: Date, checkOut: Date, rangeStart: Date, rangeEnd: Date): number {
  const overlapStart = checkIn > rangeStart ? checkIn : rangeStart;
  const overlapEnd = checkOut < rangeEnd ? checkOut : rangeEnd;
  return Math.max(0, differenceInCalendarDays(overlapEnd, overlapStart));
}

/** Proporcjonalny przychód na podstawie liczby nocy nakładających się na zakres */
export function proportionalRevenue(totalPrice: number, totalNights: number, overlapNightsCount: number): number {
  return totalNights > 0 ? totalPrice * (overlapNightsCount / totalNights) : 0;
}

/** Numer tygodnia w roku (ISO-like) */
export function getWeekOfYear(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);
}
