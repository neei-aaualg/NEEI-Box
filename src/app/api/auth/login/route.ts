import { NextResponse } from 'next/server';
import { createAndSendOtp } from '@/lib/auth/otp';
import { rateLimit } from '@/lib/rate-limit';
import { clientFacingError } from '@/lib/http';

// Max codes per email per window; prevents OTP churn on a victim's address.
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { error: 'O email é obrigatório.' },
        { status: 400 }
      );
    }

    const email = (body.email as string).trim().toLowerCase();

    const ualgEmailRegex = /^a\d+@ualg\.pt$/;
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const isAllowed = ualgEmailRegex.test(email) || adminEmails.includes(email);

    if (!isAllowed) {
      return NextResponse.json(
        {
          error:
            'Endereço de email inválido. Deve ser no formato aXXXXX@ualg.pt',
        },
        { status: 400 }
      );
    }

    const { allowed, retryAfterMs } = rateLimit(
      `login:${email}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW_MS
    );
    if (!allowed) {
      const seconds = retryAfterMs
        ? Math.ceil(retryAfterMs / 1000)
        : EMAIL_WINDOW_MS / 1000;
      return NextResponse.json(
        {
          error: `Demasiados pedidos para este email. Aguarda ${seconds}s.`,
        },
        { status: 429 }
      );
    }

    const result = await createAndSendOtp(email);
    if (!result.success) {
      return NextResponse.json(
        {
          error: clientFacingError(
            result.error,
            'Erro ao enviar o código de confirmação.'
          ),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Código de acesso enviado! Verifica o teu email.' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: clientFacingError(error, 'Erro interno do servidor.'),
      },
      { status: 500 }
    );
  }
}
