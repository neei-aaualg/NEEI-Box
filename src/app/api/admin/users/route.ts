import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        created_at: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao obter utilizadores.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido. Certifica-te de introduzir um endereço correto.' },
        { status: 400 }
      );
    }

    const role: Role = body.role === 'STUDENT' ? Role.STUDENT : Role.ADMIN;

    const user = await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, role },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt.toISOString(),
      },
      message: `Utilizador ${email} definido como ${role === 'ADMIN' ? 'Administrador' : 'Estudante'}.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar utilizador.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
