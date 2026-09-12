export type FileType =
  'pdf' | 'doc' | 'ppt' | 'xls' | 'archive' | 'image' | 'video' | 'other';

type FileTypeMeta = {
  label: string;
  gradient: string;
};

const FILE_TYPE_META: Record<FileType, FileTypeMeta> = {
  pdf: {
    label: 'PDF',
    gradient: 'from-red-500 to-rose-700',
  },
  doc: {
    label: 'DOC',
    gradient: 'from-sky-500 to-blue-700',
  },
  ppt: {
    label: 'PPT',
    gradient: 'from-orange-500 to-amber-700',
  },
  xls: {
    label: 'XLS',
    gradient: 'from-emerald-500 to-green-700',
  },
  archive: {
    label: 'ZIP',
    gradient: 'from-violet-500 to-purple-700',
  },
  image: {
    label: 'IMG',
    gradient: 'from-teal-500 to-cyan-700',
  },
  video: {
    label: 'VID',
    gradient: 'from-pink-500 to-rose-700',
  },
  other: {
    label: 'FILE',
    gradient: 'from-zinc-500 to-zinc-700',
  },
};

export const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'bmp',
  'avif',
];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2'];

export function getFileExtension(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

export function getFileType(fileName: string): FileType {
  const ext = getFileExtension(fileName);

  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt', 'tex', 'md', 'txt'].includes(ext)) return 'doc';
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'ppt';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'xls';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';

  return 'other';
}

export function getFileTypeMeta(type: FileType): FileTypeMeta {
  return FILE_TYPE_META[type];
}

export function getFileNameFromWebUrl(webUrl: string): string {
  try {
    const url = new URL(webUrl);
    const file = url.searchParams.get('file');
    if (file) {
      try {
        return decodeURIComponent(file);
      } catch {
        return file;
      }
    }
  } catch {
    // Fall through to segment-based extraction.
  }

  const segments = webUrl.split('/');
  const last = segments[segments.length - 1]?.split('?')[0];
  if (!last || last === 'Doc.aspx') return 'material';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function sanitizeFileName(fileName: string): string {
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const cleaned = normalized
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleaned || /^\.+$/.test(cleaned)) return 'ficheiro';

  const MAX_LENGTH = 80;
  if (cleaned.length <= MAX_LENGTH) return cleaned;

  const extMatch = /(\.[a-z0-9]+)$/i.exec(cleaned);
  const ext = extMatch ? extMatch[1] : '';
  const base = cleaned.slice(0, MAX_LENGTH - ext.length);
  return `${base}${ext}`;
}
