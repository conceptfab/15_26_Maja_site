import { SignJWT, jwtVerify, errors } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { getJwtSecret } from './env';
export function unauthorized() {
  return { error: 'Brak autoryzacji' };
}

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (cookie/DB)
const JWT_DURATION_MS = 24 * 60 * 60 * 1000; // 24h (JWT expiry — shorter for security)

export async function createSession(adminId: string) {
  // Clean expired sessions
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const jwtExpiresAt = new Date(Date.now() + JWT_DURATION_MS);
  const token = await new SignJWT({ adminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(jwtExpiresAt)
    .setIssuedAt()
    .sign(getJwtSecret());

  await prisma.session.create({
    data: { adminId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

export async function verifySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    let jwtExpired = false;
    try {
      await jwtVerify(token, getJwtSecret());
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        jwtExpired = true;
      } else {
        // Nieprawidłowy podpis lub inny błąd — odrzuć token
        return null;
      }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!session || session.expiresAt < new Date() || !session.admin.isActive) {
      return null;
    }

    // Odśwież JWT jeśli wygasł, ale sesja DB jest jeszcze ważna
    if (jwtExpired) {
      const jwtExpiresAt = new Date(Date.now() + JWT_DURATION_MS);
      const newToken = await new SignJWT({ adminId: session.adminId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(jwtExpiresAt)
        .setIssuedAt()
        .sign(getJwtSecret());

      await prisma.session.update({
        where: { id: session.id },
        data: { token: newToken },
      });

      cookieStore.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: session.expiresAt,
      });
    }

    return { admin: session.admin, session };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(COOKIE_NAME);
}
