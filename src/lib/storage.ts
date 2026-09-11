import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

function getSafePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.resolve(UPLOAD_DIR, normalized);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    throw new Error('Caminho de ficheiro inválido.');
  }
  return resolved;
}

export async function saveFile(
  relativePath: string,
  buffer: Buffer
): Promise<{ storagePath: string; webUrl: string }> {
  const fullPath = getSafePath(relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  // Return formatted URL and storage path
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return {
    storagePath: normalizedPath,
    webUrl: `/api/files/${normalizedPath}`,
  };
}

export async function deleteFile(relativePath: string): Promise<boolean> {
  try {
    const fullPath = getSafePath(relativePath);
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getFileStats(relativePath: string) {
  const fullPath = getSafePath(relativePath);
  if (!existsSync(fullPath)) return null;
  const stats = await fs.stat(fullPath);
  return { fullPath, size: stats.size, mtime: stats.mtime };
}

export function getFileStream(fullPath: string, options?: { start?: number; end?: number }) {
  return createReadStream(fullPath, options);
}
