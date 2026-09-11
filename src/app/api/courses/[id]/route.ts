import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { deleteFile } from '@/lib/storage';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, year, semester } = body;

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(typeof year === 'number' ? { year } : {}),
        ...(typeof semester === 'number' ? { semester } : {}),
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      year: updated.year,
      semester: updated.semester,
      created_at: updated.createdAt.toISOString(),
      materials_count: updated._count.materials,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar Unidade Curricular.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Delete associated files from storage
    const materials = await prisma.material.findMany({
      where: { courseId: id },
      select: { storagePath: true },
    });

    for (const mat of materials) {
      if (mat.storagePath) {
        await deleteFile(mat.storagePath);
      }
    }

    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao eliminar Unidade Curricular.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
