import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';

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

    const verification = await verifyOtpCode(email, token);
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || 'Código inválido ou expirado. Tenta novamente.' },
        { status: 400 }
      );
    }

    // Determine initial role
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const initialRole: Role = adminEmails.includes(email) ? Role.ADMIN : Role.STUDENT;

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
    const msg = error instanceof Error ? error.message : 'Erro na autenticação.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
