import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { saveFile } from '@/lib/storage';
import { sanitizeFileName, getFileType } from '@/lib/file-types';
import crypto from 'crypto';

const MAX_FILE_SIZE_MB = 25;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Falha ao processar o ficheiro enviado. Tenta novamente.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const originalName = (formData.get('original_name') as string) || file?.name || 'material';
    const courseId = formData.get('course_id') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';

    if (!file || !courseId || !title) {
      return NextResponse.json(
        { error: 'Faltam campos obrigatórios.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB.` },
        { status: 413 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Unidade Curricular não encontrada.' },
        { status: 404 }
      );
    }

    const isAdmin = user.role === 'ADMIN';
    const initialStatus = isAdmin ? 'approved' : 'pending';

    const safeName = sanitizeFileName(originalName);
    const relativePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { storagePath, webUrl } = await saveFile(relativePath, buffer);

    const material = await prisma.material.create({
      data: {
        courseId,
        title,
        description,
        storagePath,
        webUrl,
        fileName: originalName,
        fileType: getFileType(originalName),
        fileSize: file.size,
        uploadedById: user.id,
        reviewStatus: initialStatus,
      },
    });

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        course_id: material.courseId,
        title: material.title,
        description: material.description,
        storage_path: material.storagePath,
        web_url: material.webUrl,
        file_name: material.fileName,
        review_status: material.reviewStatus,
        uploaded_by: material.uploadedById,
        created_at: material.createdAt.toISOString(),
      },
      message: isAdmin
        ? 'Material adicionado com sucesso!'
        : 'Material submetido para aprovação.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
