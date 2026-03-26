import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getAdminSecretCode } from '@/lib/env';
import { loginSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
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
