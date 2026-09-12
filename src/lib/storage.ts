import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

// Default: 50 MB per single file
export const MAX_FILE_SIZE_MB = parseInt(
  process.env.MAX_FILE_SIZE_MB || '50',
  10
);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Default: 8 GB maximum volume storage capacity
export const MAX_STORAGE_LIMIT_GB = parseFloat(
  process.env.MAX_STORAGE_LIMIT_GB || '8'
);
export const MAX_STORAGE_LIMIT_BYTES = Math.floor(
  MAX_STORAGE_LIMIT_GB * 1024 * 1024 * 1024
);

function getSafePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.resolve(UPLOAD_DIR, normalized);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    throw new Error('Caminho de ficheiro inválido.');
  }
  return resolved;
}

export async function getTotalStorageUsedBytes(): Promise<number> {
  let total = 0;

  async function scanDir(dir: string) {
    if (!existsSync(dir)) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(full);
        } else if (entry.isFile()) {
          const stats = await fs.stat(full);
          total += stats.size;
        }
      }
    } catch {
      // Ignore concurrent directory reads
    }
  }

  await scanDir(UPLOAD_DIR);
  return total;
}

export async function checkStorageCapacity(incomingBytes: number): Promise<{
  allowed: boolean;
  currentUsedBytes: number;
  maxBytes: number;
  error?: string;
}> {
  const currentUsedBytes = await getTotalStorageUsedBytes();
  const maxBytes = MAX_STORAGE_LIMIT_BYTES;

  if (currentUsedBytes + incomingBytes > maxBytes) {
    const usedFormatted = (currentUsedBytes / (1024 * 1024 * 1024)).toFixed(2);
    const incomingFormatted = (incomingBytes / (1024 * 1024)).toFixed(1);
    return {
      allowed: false,
      currentUsedBytes,
      maxBytes,
      error: `Capacidade máxima de armazenamento de ${MAX_STORAGE_LIMIT_GB} GB atingida (${usedFormatted} GB ocupados). O envio de ${incomingFormatted} MB excede o espaço disponível.`,
    };
  }

  return {
    allowed: true,
    currentUsedBytes,
    maxBytes,
  };
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

export function getFileStream(
  fullPath: string,
  options?: { start?: number; end?: number }
) {
  return createReadStream(fullPath, options);
}
