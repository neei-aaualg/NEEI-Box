import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';

vi.hoisted(() => {
  process.env.UPLOAD_DIR = '/var/uploads';
  process.env.MAX_FILE_SIZE_MB = '50';
  process.env.MAX_STORAGE_LIMIT_GB = '8';
});

const mocks = vi.hoisted(() => {
  return {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    readFile: vi.fn(),
  };
});

vi.mock('fs/promises', () => ({
  default: { ...mocks },
  ...mocks,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const { Readable } = await import('stream');
  return {
    ...actual,
    existsSync: vi.fn(),
    createReadStream: vi.fn(() => new Readable({ read() {} })),
  };
});

import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_STORAGE_LIMIT_GB,
  MAX_STORAGE_LIMIT_BYTES,
  saveFile,
  deleteFile,
  getFileStats,
  checkStorageCapacity,
  getTotalStorageUsedBytes,
  getFileStream,
} from '@/lib/storage';

const mockExistsSync = vi.mocked(existsSync);

function readdirResult(names: string[]) {
  return names.map((name) => ({
    name,
    isDirectory: () => name === 'sub',
    isFile: () => name !== 'sub',
  }));
}

describe('storage limits from environment', () => {
  it('parses the maximum file size in MB and bytes', () => {
    expect(MAX_FILE_SIZE_MB).toBe(50);
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });

  it('parses the maximum storage limit in GB and bytes', () => {
    expect(MAX_STORAGE_LIMIT_GB).toBe(8);
    expect(MAX_STORAGE_LIMIT_BYTES).toBe(Math.floor(8 * 1024 ** 3));
  });
});

describe('saveFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
  });

  it('creates the parent directory before writing', async () => {
    await saveFile('user-1/abc.pdf', Buffer.from('data'));
    expect(mocks.mkdir).toHaveBeenCalledWith(
      '/var/uploads/user-1',
      expect.any(Object)
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(
      '/var/uploads/user-1/abc.pdf',
      Buffer.from('data')
    );
  });

  it('returns both storage path and web URL with forward slashes', async () => {
    const result = await saveFile('user-1/a.pdf', Buffer.from('x'));
    expect(result.storagePath).toBe('user-1/a.pdf');
    expect(result.webUrl).toBe('/api/files/user-1/a.pdf');
  });

  it('rejects absolute paths that merely start with the upload directory prefix', async () => {
    await expect(
      saveFile('/var/uploads-secret/evil.txt', Buffer.from('x'))
    ).rejects.toThrow();
  });

  it('rejects absolute paths that escape the upload directory', async () => {
    await expect(saveFile('/etc/passwd', Buffer.from('x'))).rejects.toThrow();
  });

  it('allows relative paths inside the upload directory', async () => {
    await expect(
      saveFile('user-1/subdir/a.pdf', Buffer.from('x'))
    ).resolves.toBeDefined();
    expect(mocks.writeFile).toHaveBeenCalledWith(
      '/var/uploads/user-1/subdir/a.pdf',
      Buffer.from('x')
    );
  });
});

describe('deleteFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an existing file and returns true', async () => {
    mockExistsSync.mockReturnValue(true);
    mocks.unlink.mockResolvedValue(undefined);

    const result = await deleteFile('a.pdf');
    expect(result).toBe(true);
    expect(mocks.unlink).toHaveBeenCalledWith('/var/uploads/a.pdf');
  });

  it('returns false without deleting when the file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    const result = await deleteFile('missing.pdf');
    expect(result).toBe(false);
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it('returns false when deletion throws', async () => {
    mockExistsSync.mockReturnValue(true);
    mocks.unlink.mockRejectedValue(new Error('permission denied'));
    await expect(deleteFile('a.pdf')).resolves.toBe(false);
  });
});

describe('getFileStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(getFileStats('missing.pdf')).resolves.toBeNull();
  });

  it('returns stats for an existing file', async () => {
    mockExistsSync.mockReturnValue(true);
    const mtime = new Date();
    mocks.stat.mockResolvedValue({ size: 1234, mtime });

    const stats = await getFileStats('a.pdf');
    expect(stats).toEqual({
      fullPath: '/var/uploads/a.pdf',
      size: 1234,
      mtime,
    });
  });
});

describe('getTotalStorageUsedBytes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when the upload directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(getTotalStorageUsedBytes()).resolves.toBe(0);
  });

  it('sums up file sizes recursively', async () => {
    mockExistsSync.mockReturnValue(true);
    mocks.readdir
      .mockResolvedValueOnce(readdirResult(['a.pdf', 'sub']))
      .mockResolvedValueOnce(readdirResult(['b.pdf']));
    mocks.stat
      .mockResolvedValueOnce({ size: 100 })
      .mockResolvedValueOnce({ size: 250 });

    await expect(getTotalStorageUsedBytes()).resolves.toBe(350);
  });
});

describe('checkStorageCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mocks.readdir.mockResolvedValue([]);
  });

  afterEach(() => {
    mockExistsSync.mockReset();
  });

  it('allows uploads within capacity', async () => {
    const result = await checkStorageCapacity(1024);
    expect(result.allowed).toBe(true);
    expect(result.currentUsedBytes).toBe(0);
    expect(result.maxBytes).toBe(MAX_STORAGE_LIMIT_BYTES);
  });

  it('allows uploads that exactly reach the limit', async () => {
    const result = await checkStorageCapacity(MAX_STORAGE_LIMIT_BYTES);
    expect(result.allowed).toBe(true);
  });

  it('rejects uploads that exceed the limit', async () => {
    mocks.readdir.mockResolvedValue(readdirResult(['big.bin']));
    mocks.stat.mockResolvedValue({ size: MAX_STORAGE_LIMIT_BYTES });

    const result = await checkStorageCapacity(1);
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/capacidade máxima|atingida/i);
    expect(result.error).toContain('MB');
  });

  it('produces a useful error message with current usage', async () => {
    mocks.readdir.mockResolvedValue(readdirResult(['big.bin']));
    mocks.stat.mockResolvedValue({ size: 2 * 1024 ** 3 });

    const result = await checkStorageCapacity(7 * 1024 ** 3);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('2.00 GB');
    expect(result.error).toContain('7168.0 MB');
  });
});

describe('getFileStream', () => {
  it('returns a readable stream for the given path', () => {
    const stream = getFileStream('/var/uploads/a.pdf');
    expect(stream).toBeDefined();
    expect(typeof stream.on).toBe('function');
    stream.destroy();
  });

  it('passes range options through', () => {
    const stream = getFileStream('/var/uploads/a.pdf', { start: 0, end: 10 });
    expect(stream).toBeDefined();
    stream.destroy();
  });
});
