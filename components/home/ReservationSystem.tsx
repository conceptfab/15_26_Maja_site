'use client';

import dynamic from 'next/dynamic';
import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import { formatPLN } from '@/lib/format';
import { EraserIcon } from '../Icons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DatePicker = dynamic(() => import('react-datepicker') as any, { ssr: false }) as any;

interface ReservationSystemProps {
  checkIn: Date | null;
  checkOut: Date | null;
  today: Date;
  dateLocale: Locale;
  locale: string;
  unavailableDates: Date[];
  onDateRangeChange: (range: [Date | null, Date | null]) => void;
  reservationGuests: string;
  onGuestsChange: (value: string) => void;
  totalPrice: number;
  nights: number;
  getNightLabel: (n: number) => string;
  showGallery: boolean;
  onSubmit: () => void;
  onClear: () => void;
  r: (field: string) => string;
  mw: (field: string) => string;
  t: (key: string) => string;
  sanitize: (html: string) => string;
}

export function ReservationSystem({
  checkIn,
  checkOut,
  today,
  dateLocale,
  locale,
  unavailableDates,
  onDateRangeChange,
  reservationGuests,
  onGuestsChange,
  totalPrice,
  nights,
  getNightLabel,
  showGallery,
  onSubmit,
  onClear,
  r,
  mw,
  t,
  sanitize,
}: ReservationSystemProps) {
  const checkInLabel = checkIn
    ? format(checkIn, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';
  const checkOutLabel = checkOut
    ? format(checkOut, 'd.MM.yyyy', { locale: dateLocale })
    : '--.--.----';

  return (
    <div className="reservation-layout__bottom">
      <div
        className={
          showGallery
            ? 'reservation-system'
            : 'reservation-system reservation-system--panel-only'
        }
      >
        <div className="reservation-system__calendar-col reservation-system__calendar-col--wide">
          <DatePicker
            selected={today}
            onChange={(update: [Date | null, Date | null]) => onDateRangeChange(update)}
            startDate={checkIn}
            endDate={checkOut}
            selectsRange
            inline
            monthsShown={2}
            locale={dateLocale}
            minDate={today}
            openToDate={today}
            formatWeekDay={(dayName: string) =>
              dayName.replace('.', '').slice(0, 3).toLowerCase()
            }
            calendarClassName="reservation-datepicker"
            fixedHeight
            excludeDates={unavailableDates}
            renderCustomHeader={({
              monthDate,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              customHeaderCount,
            }: { monthDate: Date; decreaseMonth: () => void; increaseMonth: () => void; prevMonthButtonDisabled: boolean; customHeaderCount: number }) => (
              <div className="reservation-datepicker__header">
                {customHeaderCount === 0 && (
                  <button
                    type="button"
                    className="reservation-datepicker__nav reservation-datepicker__nav--prev"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    aria-label="Poprzedni miesiąc"
                  >
                    &#x276E;
                  </button>
                )}
                <span className="reservation-datepicker__month-name">
                  {monthDate.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                {customHeaderCount === 1 && (
                  <button
                    type="button"
                    className="reservation-datepicker__nav reservation-datepicker__nav--next"
                    onClick={increaseMonth}
                    aria-label="Następny miesiąc"
                  >
                    &#x276F;
                  </button>
                )}
              </div>
            )}
          />
        </div>

        <aside
          className="reservation-summary-card"
          aria-label={mw('title')}
        >
          {checkIn && !checkOut && (
            <p className="reservation-summary-card__hint">
              {t('reservation.select_checkout')}
            </p>
          )}
          <p className="reservation-summary-card__price">
            <span>{formatPLN(totalPrice)}</span> za {nights} {getNightLabel(nights)}
          </p>

          <div className="reservation-summary-card__fields">
            <div className="reservation-summary-card__dates">
              <div className="reservation-summary-card__date-box">
                <span>{r('checkin')}</span>
                <strong>{checkInLabel}</strong>
              </div>
              <div className="reservation-summary-card__date-box">
                <span>{r('checkout')}</span>
                <strong>{checkOutLabel}</strong>
              </div>
            </div>

            <label className="reservation-summary-card__guests">
              <span>{r('guests_label')}</span>
              <select
                name="guests"
                value={reservationGuests}
                onChange={(event) => onGuestsChange(event.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? r('guest_one') : r('guest_few')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="reservation-summary-card__submit"
            onClick={onSubmit}
            disabled={!checkIn || !checkOut}
          >
            {r('submit')}
          </button>

          <p className="reservation-summary-card__note">
            {r('note')}
          </p>
        </aside>

        <button
          type="button"
          className="reservation-system__clear"
          onClick={onClear}
          style={{ justifySelf: 'end' }}
        >
          <EraserIcon />
          <span>{r('clear')}</span>
        </button>
      </div>

      <div className="reservation-info"
        dangerouslySetInnerHTML={{ __html: sanitize(r('info')) }}
      />
    </div>
  );
}
