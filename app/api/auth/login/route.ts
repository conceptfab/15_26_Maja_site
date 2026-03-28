import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getAdminSecretCode } from '@/lib/env';
import { loginSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-real-ip')
      || headersList.get('x-forwarded-for')?.split(',').pop()?.trim()
      || 'unknown';
    const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Zbyt wiele prób logowania. Spróbuj ponownie później.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Nieprawidłowe dane' },
        { status: 400 }
      );
    }

    const { email, secretCode } = parsed.data;

    // Verify secret code
    if (secretCode !== getAdminSecretCode()) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { error: 'Nieprawidłowy email lub kod' },
        { status: 401 }
      );
    }

    // Check admin whitelist
    const admin = await prisma.admin.findUnique({
      where: { email, isActive: true },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Nieprawidłowy email lub kod' },
        { status: 401 }
      );
    }

    await createSession(admin.id);

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
