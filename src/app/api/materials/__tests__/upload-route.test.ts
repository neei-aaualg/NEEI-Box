import { describe, it, expect, vi, beforeEach } from 'vitest';

const sessionMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
  },
  material: {
    create: vi.fn(),
  },
}));

const storageMocks = vi.hoisted(() => ({
  saveFile: vi.fn(),
  checkStorageCapacity: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: sessionMocks.getCurrentUser,
}));

vi.mock('@/lib/db', () => ({
  default: prismaMocks,
}));

vi.mock('@/lib/storage', () => ({
  saveFile: storageMocks.saveFile,
  checkStorageCapacity: storageMocks.checkStorageCapacity,
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
}));

import { POST } from '@/app/api/materials/upload/route';

const adminUser = { id: 'admin-1', email: 'admin@neei.online', role: 'ADMIN' };
const studentUser = {
  id: 'student-1',
  email: 'a12345@ualg.pt',
  role: 'STUDENT',
};

const dbCourse = { id: 'c1' };

function formRequest(fields: Record<string, unknown>, file?: File): Request {
  const form = new FormData();
  if (file) form.append('file', file);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, String(value));
  }
  return new Request('http://localhost/api/materials/upload', {
    method: 'POST',
    body: form,
  });
}

function pdfFile(name = 'apontamentos.pdf', size = 1024): File {
  const bytes = new Uint8Array(size).fill(65);
  return new File([bytes], name, { type: 'application/pdf' });
}

const createdMaterial = {
  id: 'm1',
  courseId: 'c1',
  title: 'Apontamentos',
  description: 'Lógica',
  storagePath: 'student-1/abc-apontamentos.pdf',
  webUrl: '/api/files/student-1/abc-apontamentos.pdf',
  fileName: 'apontamentos.pdf',
  reviewStatus: 'approved',
  uploadedById: 'student-1',
  createdAt: new Date('2026-09-01'),
};

describe('POST /api/materials/upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST(
      formRequest({ course_id: 'c1', title: 'T' }, pdfFile())
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    let res = await POST(formRequest({ title: 'T' }, pdfFile()));
    expect(res.status).toBe(400);

    res = await POST(formRequest({ course_id: 'c1' }, pdfFile()));
    expect(res.status).toBe(400);

    res = await POST(formRequest({ course_id: 'c1', title: 'T' }));
    expect(res.status).toBe(400);
  });

  it('returns 413 when the file exceeds the size limit', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const oversized = pdfFile('big.pdf', 50 * 1024 * 1024 + 1);
    const res = await POST(
      formRequest({ course_id: 'c1', title: 'T' }, oversized)
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain('50 MB');
  });

  it('does not check course existence when the file is too large', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const oversized = pdfFile('big.pdf', 50 * 1024 * 1024 + 1);
    await POST(formRequest({ course_id: 'c1', title: 'T' }, oversized));
    expect(prismaMocks.course.findUnique).not.toHaveBeenCalled();
  });

  it('returns 507 when storage capacity is exceeded', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({
      allowed: false,
      error: 'Capacidade máxima de armazenamento atingida.',
    });
    const res = await POST(
      formRequest({ course_id: 'c1', title: 'T' }, pdfFile())
    );
    expect(res.status).toBe(507);
    expect((await res.json()).error).toContain('Capacidade máxima');
  });

  it('returns 404 when the course is not found', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(null);
    const res = await POST(
      formRequest({ course_id: 'missing', title: 'T' }, pdfFile())
    );
    expect(res.status).toBe(404);
  });

  it('saves the file under the user directory with a sanitized name', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'student-1/uuid-Apontamentos Logica.pdf',
      webUrl: '/api/files/student-1/uuid-Apontamentos Logica.pdf',
    });
    prismaMocks.material.create.mockResolvedValue(createdMaterial);

    await POST(
      formRequest(
        {
          course_id: 'c1',
          title: 'T',
          original_name: 'Apontamentos Lógica.pdf',
        },
        pdfFile('Apontamentos Lógica.pdf')
      )
    );
    expect(storageMocks.saveFile).toHaveBeenCalledWith(
      expect.stringMatching(/^student-1\/[0-9a-f-]+-Apontamentos_Logica\.pdf$/),
      expect.any(Buffer)
    );
  });

  it('creates a pending material for student uploads', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'student-1/u-a.pdf',
      webUrl: '/api/files/student-1/u-a.pdf',
    });
    prismaMocks.material.create.mockResolvedValue({
      ...createdMaterial,
      reviewStatus: 'pending',
    });

    const res = await POST(
      formRequest(
        { course_id: 'c1', title: 'T', description: 'Lógica' },
        pdfFile()
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.material.review_status).toBe('pending');
    expect(body.message).toMatch(/aprovação/);
    expect(prismaMocks.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: 'pending' }),
      })
    );
  });

  it('creates an approved material for admin uploads', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'admin-1/u-a.pdf',
      webUrl: '/api/files/admin-1/u-a.pdf',
    });
    prismaMocks.material.create.mockResolvedValue(createdMaterial);

    const res = await POST(
      formRequest(
        { course_id: 'c1', title: 'T', description: 'Lógica' },
        pdfFile()
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(prismaMocks.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: 'approved' }),
      })
    );
    expect(body.message).toMatch(/adicionado com sucesso/i);
  });

  it('stores the original file name, not the sanitized one', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'student-1/u.pdf',
      webUrl: '/api/files/student-1/u.pdf',
    });
    prismaMocks.material.create.mockResolvedValue(createdMaterial);

    await POST(
      formRequest(
        { course_id: 'c1', title: 'T', original_name: 'Apont. Lógicà.pdf' },
        pdfFile('Apont. Lógicà.pdf')
      )
    );
    expect(prismaMocks.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileName: 'Apont. Lógicà.pdf',
          fileType: 'pdf',
          fileSize: 1024,
        }),
      })
    );
  });

  it('uses the uploaded file name when original_name is absent', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'student-1/u.pdf',
      webUrl: '/api/files/student-1/u.pdf',
    });
    prismaMocks.material.create.mockResolvedValue(createdMaterial);

    await POST(formRequest({ course_id: 'c1', title: 'T' }, pdfFile('a.pdf')));
    expect(prismaMocks.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fileName: 'a.pdf' }),
      })
    );
  });

  it('normalizes an empty description to an empty string', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockResolvedValue({
      storagePath: 'student-1/u.pdf',
      webUrl: '/api/files/student-1/u.pdf',
    });
    prismaMocks.material.create.mockResolvedValue(createdMaterial);

    await POST(formRequest({ course_id: 'c1', title: 'T' }, pdfFile()));
    expect(prismaMocks.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: '' }),
      })
    );
  });

  it('returns 500 when saving the file fails', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    storageMocks.checkStorageCapacity.mockResolvedValue({ allowed: true });
    prismaMocks.course.findUnique.mockResolvedValue(dbCourse);
    storageMocks.saveFile.mockRejectedValue(new Error('disk full'));
    const res = await POST(
      formRequest({ course_id: 'c1', title: 'T' }, pdfFile())
    );
    expect(res.status).toBe(500);
  });
});
