import { NextResponse, type NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFileStats } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth/session';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse('Não autorizado.', { status: 401 });
  }

  const resolvedParams = await params;
  const relativePath = (resolvedParams.path || []).join('/');

  const stats = await getFileStats(relativePath);
  if (!stats) {
    return new NextResponse('Ficheiro não encontrado.', { status: 404 });
  }

  const fileBuffer = await fs.readFile(stats.fullPath);
  const ext = path.extname(stats.fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
