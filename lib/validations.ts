import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  secretCode: z.string().min(1, 'Kod jest wymagany'),
});

export type LoginInput = z.infer<typeof loginSchema>;
