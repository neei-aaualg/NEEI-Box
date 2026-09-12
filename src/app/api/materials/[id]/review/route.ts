import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { deleteFile } from '@/lib/storage';

const ALLOWED_STATUSES = ['approved', 'rejected'];

export async function POST(
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

    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido. Usa approved ou rejected.' },
        { status: 400 }
      );
    }

    const material = await prisma.material.findUnique({
      where: { id },
      select: { id: true, storagePath: true },
    });

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado.' },
        { status: 404 }
      );
    }

    if (status === 'rejected') {
      if (material.storagePath) {
        await deleteFile(material.storagePath);
      }

      await prisma.material.delete({ where: { id } });

      return NextResponse.json({
        success: true,
        deleted: true,
        message: 'Material rejeitado e removido.',
      });
    }

    const updated = await prisma.material.update({
      where: { id },
      data: { reviewStatus: 'approved' },
    });

    return NextResponse.json({
      material: {
        id: updated.id,
        course_id: updated.courseId,
        title: updated.title,
        description: updated.description,
        storage_path: updated.storagePath,
        web_url: updated.webUrl,
        file_name: updated.fileName,
        review_status: updated.reviewStatus,
        uploaded_by: updated.uploadedById,
        created_at: updated.createdAt.toISOString(),
      },
      message: 'Material aprovado com sucesso.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao processar revisão.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
