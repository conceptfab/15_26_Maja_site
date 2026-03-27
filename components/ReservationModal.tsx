'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/lib/i18n';
import { XIcon } from 'lucide-react';

type ReservationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInLabel: string;
  checkOutLabel: string;
  nights: number;
  guests: string;
  totalPrice: number;
  nightLabel: string;
  checkIn: Date;
  checkOut: Date;
};

type FormState = 'form' | 'sending' | 'success' | 'error';

export function ReservationModal({
  open,
  onOpenChange,
  checkInLabel,
  checkOutLabel,
  nights,
  guests,
  totalPrice,
  nightLabel,
  checkIn,
  checkOut,
}: ReservationModalProps) {
  const { t } = useLocale();
  const [formState, setFormState] = useState<FormState>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rodo, setRodo] = useState(false);

  const resetForm = () => {
    setFormState('form');
    setErrorMsg('');
    setName('');
    setEmail('');
    setPhone('');
    setComment('');
    setRodo(false);
  };

  const handleClose = useCallback(() => {
    resetForm();
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
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
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

  const isValid = name.length >= 2 && email.includes('@') && phone.length >= 9 && rodo;

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
        ) : (
          <>
            <h2 className="font-heading text-base font-medium mb-4">
              {t('reservation.modal.title')}
            </h2>

            {/* Podsumowanie */}
            <div className="reservation-modal__summary">
              <p className="reservation-modal__summary-title">{t('reservation.modal.summary')}</p>
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
            </div>

            {/* Formularz */}
            <form onSubmit={handleSubmit} className="reservation-modal__form">
              <label className="reservation-modal__field">
                <span>{t('reservation.modal.name')} *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </label>

              <label className="reservation-modal__field">
                <span>{t('reservation.modal.email')} *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              <label className="reservation-modal__field">
                <span>{t('reservation.modal.phone')} *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={9}
                  autoComplete="tel"
                />
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

              <button
                type="submit"
                className="reservation-modal__btn"
                disabled={!isValid || formState === 'sending'}
              >
                {formState === 'sending'
                  ? t('reservation.modal.sending')
                  : t('reservation.modal.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
