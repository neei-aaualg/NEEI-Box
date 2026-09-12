import { NextResponse, type NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFileStats } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth/session';
import { isActiveContentExtension, canServeInline } from '@/lib/file-types';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Response headers applied to every served file so that malicious uploads
// (SVG/HTML/XML) can never execute script in the browser, even when a user
// navigates to the file in a new tab.
const FILE_RESPONSE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Referrer-Policy': 'no-referrer',
  // The URL embeds a per-upload UUID so it is effectively content-addressed;
  // keep it out of shared caches since the endpoint requires authentication.
  'Cache-Control': 'private, max-age=31536000, immutable',
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

  const ext = path.extname(stats.fullPath).toLowerCase().replace(/^\./, '');
  const isActive = isActiveContentExtension(ext);
  const contentType = isActive
    ? 'application/octet-stream'
    : MIME_TYPES[ext] || 'application/octet-stream';

  // Only raster images may be rendered inline; everything else (PDFs, office
  // docs, archives, SVG/HTML/XML) is forced to download as an attachment.
  const disposition =
    !isActive && canServeInline(ext) ? 'inline' : 'attachment';
  const fileName = path.basename(stats.fullPath).replace(/["\\]/g, '_');

  const fileBuffer = await fs.readFile(stats.fullPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      ...FILE_RESPONSE_HEADERS,
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Content-Length': stats.size.toString(),
    },
  });
}
