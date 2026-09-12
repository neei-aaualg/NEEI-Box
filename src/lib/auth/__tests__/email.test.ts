import { describe, it, expect, vi, beforeEach } from 'vitest';

const nodemailerMocks = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: nodemailerMocks.createTransport,
  },
}));

import { sendOtpEmail } from '@/lib/auth/email';

const SMTP_HOST = 'smtp.example.com';
const SMTP_PORT = '587';
const SMTP_USER = 'user@example.com';
const SMTP_PASS = 'secret';
const SMTP_FROM = 'NEEI <no-reply@neei.online>';

const ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

describe('sendOtpEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('falls back to console logging when SMTP is not configured', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await sendOtpEmail('a12345@ualg.pt', '123456');
    expect(result).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(nodemailerMocks.createTransport).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses the development fallback when only some variables are set', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await sendOtpEmail('a12345@ualg.pt', '123456');
    expect(result).toBe(true);
    expect(nodemailerMocks.createTransport).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('fails closed in production instead of printing OTP codes to logs', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await expect(sendOtpEmail('a12345@ualg.pt', '123456')).rejects.toThrow(
        'Serviço de email não configurado.'
      );
      expect(spy).not.toHaveBeenCalled();
      expect(nodemailerMocks.createTransport).not.toHaveBeenCalled();
      spy.mockRestore();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('creates an SMTP transport when fully configured', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = SMTP_PORT;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;

    nodemailerMocks.sendMail.mockResolvedValue({});
    const result = await sendOtpEmail('a12345@ualg.pt', '123456');

    expect(nodemailerMocks.createTransport).toHaveBeenCalledWith({
      host: SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    expect(result).toBe(true);
  });

  it('enables TLS when the port is 465', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;

    nodemailerMocks.sendMail.mockResolvedValue({});
    await sendOtpEmail('a12345@ualg.pt', '123456');
    expect(nodemailerMocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true })
    );
  });

  it('uses the default sender when SMTP_FROM is missing', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = SMTP_PORT;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;

    nodemailerMocks.sendMail.mockResolvedValue({});
    await sendOtpEmail('a12345@ualg.pt', '123456');
    const mail = nodemailerMocks.sendMail.mock.calls[0][0];
    expect(mail.from).toContain('NEEI-Box');
  });

  it('uses SMTP_FROM when provided', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = SMTP_PORT;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;
    process.env.SMTP_FROM = SMTP_FROM;

    nodemailerMocks.sendMail.mockResolvedValue({});
    await sendOtpEmail('a12345@ualg.pt', '123456');
    const mail = nodemailerMocks.sendMail.mock.calls[0][0];
    expect(mail.from).toBe(SMTP_FROM);
  });

  it('sends the code to the correct recipient with a clear subject', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = SMTP_PORT;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;

    nodemailerMocks.sendMail.mockResolvedValue({});
    await sendOtpEmail('a12345@ualg.pt', '654321');
    const mail = nodemailerMocks.sendMail.mock.calls[0][0];
    expect(mail.to).toBe('a12345@ualg.pt');
    expect(mail.subject).toContain('654321');
    expect(mail.text).toContain('654321');
    expect(mail.html).toContain('654321');
  });

  it('propagates SMTP send failures', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_PORT = SMTP_PORT;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;

    nodemailerMocks.sendMail.mockRejectedValue(new Error('smtp offline'));
    await expect(sendOtpEmail('a12345@ualg.pt', '123456')).rejects.toThrow(
      'smtp offline'
    );
  });

  it('uses the default port 587 when SMTP_PORT is invalid or missing', async () => {
    process.env.SMTP_HOST = SMTP_HOST;
    process.env.SMTP_USER = SMTP_USER;
    process.env.SMTP_PASS = SMTP_PASS;
    process.env.SMTP_PORT = '';

    nodemailerMocks.sendMail.mockResolvedValue({});
    await sendOtpEmail('a12345@ualg.pt', '123456');
    expect(nodemailerMocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587 })
    );
  });
});
