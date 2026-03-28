import { addDays, getDay } from 'date-fns';
import type { SiteSettingsMap } from '@/actions/settings';

type PricingSettings = Pick<
  SiteSettingsMap,
  | 'pricePerNight'
  | 'priceWeekend'
  | 'priceSeasonHigh'
  | 'priceSeasonLow'
  | 'seasonHighStart'
  | 'seasonHighEnd'
  | 'longStayDiscount'
  | 'longStayThreshold'
  | 'depositPercent'
>;

export type PricingRuleRange = {
  dateFrom: Date;
  dateTo: Date;
  pricePerNight: number;
};

function isHighSeason(date: Date, start: string, end: string): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;

  // Handle wrap-around (e.g. start=11-01, end=03-31)
  if (start <= end) {
    return mmdd >= start && mmdd <= end;
  }
  return mmdd >= start || mmdd <= end;
}

function isWeekendNight(date: Date): boolean {
  const day = getDay(date);
  // Friday (5) or Saturday (6) — the night of Fri→Sat and Sat→Sun
  return day === 5 || day === 6;
}

/**
 * Znajdź regułę cenową dla danej nocy.
 * Reguły z cennika mają najwyższy priorytet.
 */
function findPricingRule(date: Date, rules: PricingRuleRange[]): PricingRuleRange | undefined {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return rules.find((r) => dayStart >= r.dateFrom && dayStart <= r.dateTo);
}

export type PriceBreakdown = {
  totalPrice: number;
  nightPrices: number[];
  discount: number;
  priceBeforeDiscount: number;
  depositAmount: number;
};

/**
 * Calculate total price for a stay.
 * Priority: PricingRule (cennik) > weekend > season > default.
 * Each entry in nightPrices corresponds to the night starting on that date.
 */
export function calculatePrice(
  checkIn: Date,
  checkOut: Date,
  settings: PricingSettings,
  pricingRules: PricingRuleRange[] = [],
): PriceBreakdown {
  const nights: number[] = [];
  let current = new Date(checkIn);
  const end = new Date(checkOut);

  while (current < end) {
    // 1. Sprawdź cennik (najwyższy priorytet)
    const rule = findPricingRule(current, pricingRules);
    if (rule) {
      nights.push(rule.pricePerNight);
      current = addDays(current, 1);
      continue;
    }

    // 2. Domyślna logika: sezon/weekend/baza
    let price = settings.pricePerNight;

    const highSeason = isHighSeason(current, settings.seasonHighStart, settings.seasonHighEnd);
    if (highSeason && settings.priceSeasonHigh > 0) {
      price = settings.priceSeasonHigh;
    } else if (!highSeason && settings.priceSeasonLow > 0) {
      price = settings.priceSeasonLow;
    }

    if (isWeekendNight(current) && settings.priceWeekend > 0) {
      price = settings.priceWeekend;
    }

    nights.push(price);
    current = addDays(current, 1);
  }

  const priceBeforeDiscount = nights.reduce((sum, p) => sum + p, 0);
  let discount = 0;

  if (
    settings.longStayDiscount > 0 &&
    settings.longStayThreshold > 0 &&
    nights.length >= settings.longStayThreshold
  ) {
    discount = Math.round(priceBeforeDiscount * settings.longStayDiscount / 100);
  }

  const totalPrice = Math.round(priceBeforeDiscount - discount);
  const depositAmount = settings.depositPercent > 0
    ? Math.round(totalPrice * settings.depositPercent / 100)
    : 0;

  return {
    totalPrice,
    nightPrices: nights,
    discount,
    priceBeforeDiscount: Math.round(priceBeforeDiscount),
    depositAmount,
  };
}
