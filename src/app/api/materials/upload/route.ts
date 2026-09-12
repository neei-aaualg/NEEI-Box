import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import {
  saveFileStream,
  FileSizeLimitError,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  checkStorageCapacity,
} from '@/lib/storage';
import { sanitizeFileName, getFileType } from '@/lib/file-types';
import { clientFacingError } from '@/lib/http';
import crypto from 'crypto';

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
    const originalName =
      (formData.get('original_name') as string) || file?.name || 'material';
    const courseId = formData.get('course_id') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';

    if (!file || !courseId || !title) {
      return NextResponse.json(
        { error: 'Faltam campos obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Limite por ficheiro (ex: 50 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `O ficheiro excede o limite máximo permitido de ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 413 }
      );
    }

    // 2. Limite total do volume (8 GB)
    const capacity = await checkStorageCapacity(file.size);
    if (!capacity.allowed) {
      return NextResponse.json(
        {
          error:
            capacity.error ||
            'Espaço de armazenamento insuficiente no servidor.',
        },
        { status: 507 }
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

    let stored: { storagePath: string; webUrl: string };
    try {
      stored = await saveFileStream(relativePath, file.stream());
    } catch (error) {
      if (error instanceof FileSizeLimitError) {
        return NextResponse.json(
          { error: 'O ficheiro excede o limite máximo permitido.' },
          { status: 413 }
        );
      }
      throw error;
    }
    const { storagePath, webUrl } = stored;

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
    const message = clientFacingError(error, 'Erro interno no servidor.');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
