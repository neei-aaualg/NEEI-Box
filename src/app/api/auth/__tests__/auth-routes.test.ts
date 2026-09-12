import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const Role = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
} as const;

const otpMocks = vi.hoisted(() => ({
  createAndSendOtp: vi.fn(),
  verifyOtpCode: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
}));

const userMocks = vi.hoisted(() => ({
  upsert: vi.fn(),
}));

vi.mock('@/lib/auth/otp', () => ({
  createAndSendOtp: otpMocks.createAndSendOtp,
  verifyOtpCode: otpMocks.verifyOtpCode,
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: sessionMocks.createSession,
}));

vi.mock('@/lib/db', () => ({
  default: {
    user: userMocks,
  },
}));

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as verifyPOST } from '@/app/api/auth/verify/route';

const ENV_KEYS = ['ADMIN_EMAILS'];

function jsonRequest(body: unknown, valid = true): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: valid ? { 'content-type': 'application/json' } : {},
    body: valid ? JSON.stringify(body) : 'not-json',
  });
}

const createdUser = {
  id: 'user-1',
  email: 'a12345@ualg.pt',
  role: Role.STUDENT,
  createdAt: new Date(),
};

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('rejects requests without an email', async () => {
    const res = await loginPOST(jsonRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('email');
  });

  it('rejects empty email strings', async () => {
    const res = await loginPOST(jsonRequest({ email: '   ' }));
    expect(res.status).toBe(400);
  });

  it('rejects non-UAlg email addresses', async () => {
    const res = await loginPOST(jsonRequest({ email: 'foobar@gmail.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ualg\.pt/i);
  });

  it('rejects university emails that do not match the student pattern', async () => {
    const res = await loginPOST(jsonRequest({ email: 'prof@ualg.pt' }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid student email aXXXXX@ualg.pt', async () => {
    otpMocks.createAndSendOtp.mockResolvedValue({ success: true });
    const res = await loginPOST(jsonRequest({ email: 'a12345@ualg.pt' }));
    expect(res.status).toBe(200);
    expect(otpMocks.createAndSendOtp).toHaveBeenCalledWith('a12345@ualg.pt');
  });

  it('accepts any digit count after the leading a', async () => {
    otpMocks.createAndSendOtp.mockResolvedValue({ success: true });
    const res = await loginPOST(jsonRequest({ email: 'a000001@ualg.pt' }));
    expect(res.status).toBe(200);
  });

  it('normalizes emails to lowercase and trims whitespace', async () => {
    otpMocks.createAndSendOtp.mockResolvedValue({ success: true });
    const res = await loginPOST(jsonRequest({ email: '  A000000@UALG.PT  ' }));
    expect(res.status).toBe(200);
    expect(otpMocks.createAndSendOtp).toHaveBeenCalledWith('a000000@ualg.pt');
  });

  it('accepts admin emails listed in ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'admin@neei.com,  outroadmin@example.com ';
    otpMocks.createAndSendOtp.mockResolvedValue({ success: true });
    const res = await loginPOST(
      jsonRequest({ email: 'OutroAdmin@example.com' })
    );
    expect(res.status).toBe(200);
  });

  it('ignores empty entries in ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'admin@neei.com,,  ,';
    otpMocks.createAndSendOtp.mockResolvedValue({ success: true });
    const res = await loginPOST(jsonRequest({ email: 'admin@neei.com' }));
    expect(res.status).toBe(200);
  });

  it('returns 500 when OTP generation fails', async () => {
    otpMocks.createAndSendOtp.mockResolvedValue({
      success: false,
      error: 'SMTP offline',
    });
    const res = await loginPOST(jsonRequest({ email: 'a12345@ualg.pt' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('SMTP offline');
  });

  it('returns a default error message when OTP fails without one', async () => {
    otpMocks.createAndSendOtp.mockResolvedValue({ success: false });
    const res = await loginPOST(jsonRequest({ email: 'a12345@ualg.pt' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain('código de confirmação');
  });

  it('returns 500 for malformed JSON bodies', async () => {
    const res = await loginPOST(jsonRequest({}, false));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('rejects requests missing email or token', async () => {
    const res = await verifyPOST(jsonRequest({ email: 'x' }));
    expect(res.status).toBe(400);
    const res2 = await verifyPOST(jsonRequest({ token: 'x' }));
    expect(res2.status).toBe(400);
  });

  it('rejects empty strings', async () => {
    const res = await verifyPOST(jsonRequest({ email: ' ', token: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when the OTP verification fails', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({
      success: false,
      error: 'Código incorreto.',
    });
    const res = await verifyPOST(
      jsonRequest({ email: 'a12345@ualg.pt', token: '000000' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Código incorreto.');
  });

  it('normalizes email before verification', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({ success: true });
    userMocks.upsert.mockResolvedValue(createdUser);
    sessionMocks.createSession.mockResolvedValue('raw-token');
    await verifyPOST(
      jsonRequest({ email: '  A12345@UALG.PT ', token: ' 123456 ' })
    );
    expect(otpMocks.verifyOtpCode).toHaveBeenCalledWith(
      'a12345@ualg.pt',
      '123456'
    );
  });

  it('creates a STUDENT for emails not in ADMIN_EMAILS', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({ success: true });
    userMocks.upsert.mockResolvedValue(createdUser);
    sessionMocks.createSession.mockResolvedValue('raw-token');
    const res = await verifyPOST(
      jsonRequest({ email: 'a12345@ualg.pt', token: '123456' })
    );
    expect(res.status).toBe(200);
    expect(userMocks.upsert).toHaveBeenCalledWith({
      where: { email: 'a12345@ualg.pt' },
      update: {},
      create: { email: 'a12345@ualg.pt', role: Role.STUDENT },
    });
    expect(sessionMocks.createSession).toHaveBeenCalledWith('user-1');
  });

  it('creates an ADMIN for emails listed in ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'admin@neei.online';
    otpMocks.verifyOtpCode.mockResolvedValue({ success: true });
    const adminUser = { ...createdUser, email: 'ADMIN@NEEI.ONLINE' };
    userMocks.upsert.mockResolvedValue(adminUser);
    sessionMocks.createSession.mockResolvedValue('raw-token');
    await verifyPOST(
      jsonRequest({ email: 'Admin@NEEI.Online', token: '123456' })
    );
    expect(userMocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: Role.ADMIN }),
      })
    );
  });

  it('returns success for a valid verification', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({ success: true });
    userMocks.upsert.mockResolvedValue(createdUser);
    sessionMocks.createSession.mockResolvedValue('raw-token');
    const res = await verifyPOST(
      jsonRequest({ email: 'a12345@ualg.pt', token: '123456' })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('uses the fallback error message when verification fails without one', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({ success: false });
    const res = await verifyPOST(
      jsonRequest({ email: 'a12345@ualg.pt', token: '123456' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inválido ou expirado/i);
  });

  it('returns 500 when the database upsert throws', async () => {
    otpMocks.verifyOtpCode.mockResolvedValue({ success: true });
    userMocks.upsert.mockRejectedValue(new Error('db down'));
    const res = await verifyPOST(
      jsonRequest({ email: 'a12345@ualg.pt', token: '123456' })
    );
    expect(res.status).toBe(500);
  });

  it('returns 500 for malformed JSON bodies', async () => {
    const res = await verifyPOST(jsonRequest({}, false));
    expect(res.status).toBe(500);
  });
});
