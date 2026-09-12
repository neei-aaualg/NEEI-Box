import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

type TokenRecord = {
  id: string;
  email: string;
  tokenHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
};

const prismaMocks = vi.hoisted(() => {
  const token = (overrides = {}): TokenRecord =>
    ({
      id: 'token-1',
      email: 'a12345@ualg.pt',
      tokenHash: 'hash',
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ...overrides,
    }) as TokenRecord;

  return {
    otpToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    token,
    now: () => new Date(),
  };
});

vi.mock('@/lib/db', () => ({
  default: {
    otpToken: prismaMocks.otpToken,
  },
}));

vi.mock('@/lib/auth/email', () => ({
  sendOtpEmail: vi.fn(),
}));

import { createAndSendOtp, verifyOtpCode } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/auth/email';

const mockSendEmail = vi.mocked(sendOtpEmail);

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('createAndSendOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.otpToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMocks.otpToken.create.mockResolvedValue({
      id: 'token-2',
      email: 'a12345@ualg.pt',
      tokenHash: 'hash',
    });
    mockSendEmail.mockResolvedValue(true);
  });

  it('normalizes and uses a lowercase trimmed email', async () => {
    await createAndSendOtp('  A12345@UALG.PT  ');
    expect(prismaMocks.otpToken.deleteMany).toHaveBeenCalledWith({
      where: { email: 'a12345@ualg.pt' },
    });
    expect(prismaMocks.otpToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a12345@ualg.pt',
        }),
      })
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      'a12345@ualg.pt',
      expect.any(String)
    );
  });

  it('deletes any existing tokens before creating a new one', async () => {
    await createAndSendOtp('a12345@ualg.pt');
    expect(prismaMocks.otpToken.deleteMany).toHaveBeenCalled();
    const createCall = prismaMocks.otpToken.create.mock.calls[0][0];
    expect(createCall.data).toBeDefined();
  });

  it('generates a 6-digit numeric code', async () => {
    await createAndSendOtp('a12345@ualg.pt');
    const code = mockSendEmail.mock.calls[0][1];
    expect(code).toMatch(/^\d{6}$/);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThan(1000000);
  });

  it('sets the token expiry roughly 10 minutes in the future', async () => {
    const before = Date.now();
    await createAndSendOtp('a12345@ualg.pt');
    const createCall = prismaMocks.otpToken.create.mock.calls[0][0];
    const expires = new Date(createCall.data.expiresAt).getTime();
    expect(expires).toBeGreaterThanOrEqual(before + 10 * 60 * 1000 - 1000);
    expect(expires).toBeLessThanOrEqual(before + 10 * 60 * 1000 + 1000);
  });

  it('does not store the raw code', async () => {
    await createAndSendOtp('a12345@ualg.pt');
    const code = mockSendEmail.mock.calls[0][1];
    const createJson = JSON.stringify(prismaMocks.otpToken.create.mock.calls);
    expect(createJson).not.toContain(code);
  });

  it('sends the email and returns success', async () => {
    const result = await createAndSendOtp('a12345@ualg.pt');
    expect(result).toEqual({ success: true });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it('returns a failure response when prisma throws', async () => {
    prismaMocks.otpToken.deleteMany.mockRejectedValue(new Error('db down'));
    const result = await createAndSendOtp('a12345@ualg.pt');
    expect(result.success).toBe(false);
    expect(result.error).toBe('db down');
  });

  it('returns a generic error for non-Error exceptions', async () => {
    prismaMocks.otpToken.deleteMany.mockRejectedValue('boom');
    const result = await createAndSendOtp('a12345@ualg.pt');
    expect(result).toEqual({
      success: false,
      error: 'Falha ao gerar o código.',
    });
  });
});

describe('verifyOtpCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the email before looking up the token', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(
      prismaMocks.token({ tokenHash: 'hash' })
    );
    await verifyOtpCode('  A12345@UALG.PT ', '123456');
    expect(prismaMocks.otpToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'a12345@ualg.pt' }),
      })
    );
  });

  it('only considers tokens that have not expired', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(prismaMocks.token());
    await verifyOtpCode('a12345@ualg.pt', '000000');
    const where = prismaMocks.otpToken.findFirst.mock.calls[0][0].where;
    expect(where.expiresAt).toBeInstanceOf(Object);
  });

  it('returns expired/inexistent error when no matching token', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(null);
    const result = await verifyOtpCode('a12345@ualg.pt', '123456');
    expect(result).toEqual({
      success: false,
      error: 'Código expirado ou inexistente. Pede um novo.',
    });
  });

  it('deletes the token and reports failure when attempts exceed 5', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(
      prismaMocks.token({ attempts: 5, tokenHash: 'hash' })
    );
    prismaMocks.otpToken.delete.mockResolvedValue({});
    const result = await verifyOtpCode('a12345@ualg.pt', '123456');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Demasiadas tentativas/i);
    expect(prismaMocks.otpToken.delete).toHaveBeenCalledWith({
      where: { id: 'token-1' },
    });
  });

  it('increments attempts on a wrong code', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(
      prismaMocks.token({ attempts: 1, tokenHash: 'different' })
    );
    prismaMocks.otpToken.update.mockResolvedValue({});
    const result = await verifyOtpCode('a12345@ualg.pt', '999999');
    expect(result).toEqual({ success: false, error: 'Código incorreto.' });
    expect(prismaMocks.otpToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('consumes the token on a correct code and returns success', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(
      prismaMocks.token({ tokenHash: sha256('123456'), attempts: 0 })
    );
    prismaMocks.otpToken.delete.mockResolvedValue({});
    const result = await verifyOtpCode('a12345@ualg.pt', '123456');
    expect(result).toEqual({ success: true });
    expect(prismaMocks.otpToken.delete).toHaveBeenCalledWith({
      where: { id: 'token-1' },
    });
  });

  it('trims the code before hashing (leading/trailing spaces ok)', async () => {
    prismaMocks.otpToken.findFirst.mockResolvedValue(
      prismaMocks.token({ tokenHash: sha256('123456'), attempts: 0 })
    );
    prismaMocks.otpToken.delete.mockResolvedValue({});
    const result = await verifyOtpCode('a12345@ualg.pt', '  123456  ');
    expect(result.success).toBe(true);
  });

  it('returns a failure response when prisma throws', async () => {
    prismaMocks.otpToken.findFirst.mockRejectedValue(new Error('db down'));
    const result = await verifyOtpCode('a12345@ualg.pt', '123456');
    expect(result.success).toBe(false);
    expect(result.error).toBe('db down');
  });

  it('returns a generic error for non-Error exceptions', async () => {
    prismaMocks.otpToken.findFirst.mockRejectedValue('boom');
    const result = await verifyOtpCode('a12345@ualg.pt', '123456');
    expect(result).toEqual({
      success: false,
      error: 'Falha na verificação.',
    });
  });
});
