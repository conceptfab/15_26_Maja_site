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
