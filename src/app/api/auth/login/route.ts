import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const body = await request.json();
    
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    const ualgEmailRegex = /^a\d+@ualg\.pt$/;
    if (!ualgEmailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address. Must be in the format aXXXXX@ualg.pt' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const origin = new URL(request.url).origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Magic link sent! Check your inbox.',
    }, {status: 200});
}