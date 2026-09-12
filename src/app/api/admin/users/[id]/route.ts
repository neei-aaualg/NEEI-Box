import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';
import { clientFacingError } from '@/lib/http';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const targetRole = body.role as string;

    if (targetRole !== 'ADMIN' && targetRole !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Cargo inválido. Tem de ser ADMIN ou STUDENT.' },
        { status: 400 }
      );
    }

    // Protection: an admin cannot demote themselves
    if (currentUser.id === id && targetRole !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Não podes despromover o teu próprio cargo de administrador.',
        },
        { status: 400 }
      );
    }

    // Protection: cannot demote the only remaining admin
    if (targetRole === 'STUDENT') {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Utilizador não encontrado.' },
          { status: 404 }
        );
      }

      if (targetUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            {
              error:
                'Não podes despromover o único administrador da plataforma.',
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: targetRole as Role },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        created_at: updated.createdAt.toISOString(),
      },
      message: `Cargo de ${updated.email} atualizado para ${targetRole === 'ADMIN' ? 'Administrador' : 'Estudante'}.`,
    });
  } catch (error) {
    const msg = clientFacingError(error, 'Erro ao atualizar utilizador.');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
