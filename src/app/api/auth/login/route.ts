import { NextResponse } from 'next/server';
import { createAndSendOtp } from '@/lib/auth/otp';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json({ error: 'O email é obrigatório.' }, { status: 400 });
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
        { error: 'Endereço de email inválido. Deve ser no formato aXXXXX@ualg.pt' },
        { status: 400 }
      );
    }

    const result = await createAndSendOtp(email);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar o código de confirmação.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Código de acesso enviado! Verifica o teu email.' },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
