import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    const result = await verifySession();

    if (!result) {
      return NextResponse.json(
        { error: 'Nie zalogowano' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
