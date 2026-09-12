import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import type { User } from '@prisma/client';

// __Host- prefix requires Secure, Path=/, and no Domain attribute; browsers
// drop the cookie entirely if those invariants are violated, which prevents
// injection/overwriting from sibling domains. HTTPS is enforced in production;
// localhost is treated as a secure context so dev login keeps working.
export const SESSION_COOKIE_NAME = '__Host-neei_box_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    priority: 'high',
  });

  return rawToken;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await prisma.session.deleteMany({
        where: { tokenHash },
      });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore error on logout
  }
}
