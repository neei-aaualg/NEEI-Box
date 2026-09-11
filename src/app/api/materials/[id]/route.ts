import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { deleteFile } from '@/lib/storage';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const material = await prisma.material.findUnique({
      where: { id },
      select: { storagePath: true },
    });

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado.' },
        { status: 404 }
      );
    }

    if (material.storagePath) {
      await deleteFile(material.storagePath);
    }

    await prisma.material.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao eliminar material.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
