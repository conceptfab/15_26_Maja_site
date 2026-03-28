import { differenceInCalendarDays } from 'date-fns';

/**
 * Oblicza liczbę nocy z rezerwacji przypadających na dany zakres dat.
 */
export function overlapNights(checkIn: Date, checkOut: Date, rangeStart: Date, rangeEnd: Date): number {
  const overlapStart = checkIn > rangeStart ? checkIn : rangeStart;
  const overlapEnd = checkOut < rangeEnd ? checkOut : rangeEnd;
  return Math.max(0, differenceInCalendarDays(overlapEnd, overlapStart));
}
