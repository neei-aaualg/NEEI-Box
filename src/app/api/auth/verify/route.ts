import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';
import { rateLimit } from '@/lib/rate-limit';

// Max verification attempts per email per window; forces attackers to request
// a new code (and hit the login rate limit) before brute-forcing further.
const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();
    const token = (body.token as string)?.trim();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email e código são obrigatórios.' },
        { status: 400 }
      );
    }

    const { allowed, retryAfterMs } = rateLimit(
      `verify:${email}`,
      VERIFY_LIMIT,
      VERIFY_WINDOW_MS
    );
    if (!allowed) {
      const seconds = retryAfterMs
        ? Math.ceil(retryAfterMs / 1000)
        : VERIFY_WINDOW_MS / 1000;
      return NextResponse.json(
        {
          error: `Demasiadas tentativas para este email. Aguarda ${seconds}s.`,
        },
        { status: 429 }
      );
    }

    const verification = await verifyOtpCode(email, token);
    if (!verification.success) {
      return NextResponse.json(
        {
          error:
            verification.error ||
            'Código inválido ou expirado. Tenta novamente.',
        },
        { status: 400 }
      );
    }

    // Determine initial role
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const initialRole: Role = adminEmails.includes(email)
      ? Role.ADMIN
      : Role.STUDENT;

    // Get or create user profile
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        role: initialRole,
      },
    });

    // Create session cookie
    await createSession(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Erro na autenticação.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
