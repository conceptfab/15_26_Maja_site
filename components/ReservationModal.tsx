'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useLocale } from '@/lib/i18n';
import { PHONE_REGEX } from '@/lib/validations';
import { XIcon } from 'lucide-react';

type ReservationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInLabel: string;
  checkOutLabel: string;
  nights: number;
  guests: string;
  totalPrice: number;
  depositAmount: number;
  nightLabel: string;
  checkIn: Date;
  checkOut: Date;
};

type FormState = 'summary' | 'form' | 'sending' | 'success' | 'error';

export function ReservationModal({
  open,
  onOpenChange,
  checkInLabel,
  checkOutLabel,
  nights,
  guests,
  totalPrice,
  depositAmount,
  nightLabel,
  checkIn,
  checkOut,
}: ReservationModalProps) {
  const { t } = useLocale();
  const [formState, setFormState] = useState<FormState>('summary');
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rodo, setRodo] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const errors = {
    name: name.length < 2 ? t('reservation.modal.err_name') : '',
    email: !EMAIL_RE.test(email) ? t('reservation.modal.err_email') : '',
    phone: !PHONE_REGEX.test(phone) ? t('reservation.modal.err_phone') : '',
  };

  const handleClose = useCallback(() => {
    setFormState('summary');
    setErrorMsg('');
    setTouched({});
    setName('');
    setEmail('');
    setPhone('');
    setComment('');
    setRodo(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    // Block body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          checkIn: format(checkIn, 'yyyy-MM-dd'),
          checkOut: format(checkOut, 'yyyy-MM-dd'),
          guests: Number(guests),
          comment: comment || undefined,
          rodoConsent: rodo,
        }),
      });

      if (res.ok) {
        setFormState('success');
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrorMsg(t('reservation.modal.unavailable'));
        } else {
          setErrorMsg(data.error || t('reservation.modal.error'));
        }
        setFormState('error');
      }
    } catch {
      setErrorMsg(t('reservation.modal.error'));
      setFormState('error');
    }
  };

  const isValid = !errors.name && !errors.email && !errors.phone && rodo;

  if (!open) return null;

  return (
    <div className="reservation-modal-overlay" onClick={handleClose}>
      <div
        className="reservation-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('reservation.modal.title')}
      >
        {/* Close button */}
        <button
          type="button"
          className="reservation-modal-panel__close"
          onClick={handleClose}
          aria-label="Close"
        >
          <XIcon size={20} />
        </button>

        {formState === 'success' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="font-heading text-base font-medium mb-2">
              {t('reservation.modal.success_title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('reservation.modal.success_text')}
            </p>
            <button
              type="button"
              className="reservation-modal__btn reservation-modal__btn--secondary"
              onClick={handleClose}
            >
              {t('reservation.modal.close')}
            </button>
          </div>
        ) : formState === 'summary' ? (
          <>
            <h2 className="font-heading text-base font-medium mb-4">
              {t('reservation.modal.summary')}
            </h2>

            <div className="reservation-modal__summary">
              <div className="reservation-modal__summary-grid">
                <span>{t('reservation.checkin')}</span>
                <strong>{checkInLabel}</strong>
                <span>{t('reservation.checkout')}</span>
                <strong>{checkOutLabel}</strong>
                <span>{t('reservation.guests')}</span>
                <strong>{guests}</strong>
              </div>
              <p className="reservation-modal__summary-total">
                {totalPrice} zł — {nights} {nightLabel}
              </p>
              {depositAmount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Zaliczka: <strong>{depositAmount} zł</strong>
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              {t('reservation.note')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                className="reservation-modal__btn reservation-modal__btn--secondary flex-1"
                onClick={handleClose}
              >
                {t('reservation.modal.back')}
              </button>
              <button
                type="button"
                className="reservation-modal__btn flex-1"
                onClick={() => setFormState('form')}
              >
                {t('reservation.modal.continue')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-base font-medium mb-4">
              {t('reservation.modal.title')}
            </h2>

            {/* Formularz */}
            <form onSubmit={handleSubmit} className="reservation-modal__form">
              <label className="reservation-modal__field">
                <span>{t('reservation.modal.name')} *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched('name')}
                  required
                  minLength={2}
                  autoComplete="name"
                />
                {touched.name && errors.name && (
                  <span className="reservation-modal__field-error">{errors.name}</span>
                )}
              </label>

              <label className="reservation-modal__field">
                <span>{t('reservation.modal.email')} *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched('email')}
                  required
                  autoComplete="email"
                />
                {touched.email && errors.email && (
                  <span className="reservation-modal__field-error">{errors.email}</span>
                )}
              </label>

              <label className="reservation-modal__field">
                <span>{t('reservation.modal.phone')} *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched('phone')}
                  required
                  minLength={9}
                  autoComplete="tel"
                />
                {touched.phone && errors.phone && (
                  <span className="reservation-modal__field-error">{errors.phone}</span>
                )}
              </label>

              <label className="reservation-modal__field">
                <span>{t('reservation.modal.comment')}</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </label>

              <label className="reservation-modal__checkbox">
                <input
                  type="checkbox"
                  checked={rodo}
                  onChange={(e) => setRodo(e.target.checked)}
                  required
                />
                <span>
                  {t('reservation.modal.rodo')}{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    {t('reservation.modal.rodo_link')}
                  </a>
                </span>
              </label>

              {formState === 'error' && (
                <p className="reservation-modal__error">{errorMsg}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="reservation-modal__btn reservation-modal__btn--secondary flex-1"
                  onClick={() => setFormState('summary')}
                >
                  {t('reservation.modal.back')}
                </button>
                <button
                  type="submit"
                  className="reservation-modal__btn flex-1"
                  disabled={!isValid || formState === 'sending'}
                >
                  {formState === 'sending'
                    ? t('reservation.modal.sending')
                    : t('reservation.modal.submit')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
