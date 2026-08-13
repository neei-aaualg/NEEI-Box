import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email as string)?.trim().toLowerCase();
  const token = (body.token as string)?.trim();

  if (!email || !token) {
    return NextResponse.json(
      { error: 'Email e código são obrigatórios.' },
      { status: 400 }
    );
  }

  const ualgEmailRegex = /^a\d+@ualg\.pt$/;
  if (!ualgEmailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email address. Must be in the format aXXXXX@ualg.pt' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return NextResponse.json(
      { error: 'Código inválido ou expirado. Tenta novamente.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
