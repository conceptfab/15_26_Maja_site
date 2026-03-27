import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  secretCode: z.string().min(1, 'Kod jest wymagany'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// --- Rezerwacje ---

export const reservationSchema = z.object({
  guestName: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  guestEmail: z.string().email('Nieprawidłowy adres email'),
  guestPhone: z.string().min(9, 'Nieprawidłowy numer telefonu'),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().min(1).max(6),
  comment: z.string().max(1000).optional(),
  rodoConsent: z.literal(true, {
    error: 'Zgoda RODO jest wymagana',
  }),
}).refine((data) => data.checkOut > data.checkIn, {
  message: 'Data wymeldowania musi być po dacie zameldowania',
  path: ['checkOut'],
}).refine((data) => data.checkIn >= new Date(new Date().toDateString()), {
  message: 'Data zameldowania nie może być w przeszłości',
  path: ['checkIn'],
});

export type ReservationInput = z.infer<typeof reservationSchema>;

export const reservationStatusSchema = z.enum([
  'PENDING',
  'DEPOSIT_PAID',
  'PAID',
  'CANCELLED',
  'COMPLETED',
]);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
