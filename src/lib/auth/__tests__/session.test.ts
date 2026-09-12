import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const prismaMocks = vi.hoisted(() => ({
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

const cookieMocks = vi.hoisted(() => {
  const store = {
    map: new Map<string, { value: string }>(),
    options: new Map<string, { secure?: boolean }>(),
    get: vi.fn((name: string) => store.map.get(name) ?? undefined),
    set: vi.fn((name: string, value: string, opts?: { secure?: boolean }) => {
      store.map.set(name, { value });
      if (opts) store.options.set(name, opts);
    }),
    delete: vi.fn((name: string) => {
      store.map.delete(name);
    }),
  };
  return store;
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieMocks),
}));

vi.mock('@/lib/db', () => ({
  default: {
    session: prismaMocks.session,
  },
}));

import { cookies } from 'next/headers';
import {
  createSession,
  getCurrentUser,
  destroySession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';

vi.mocked(cookies);

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const validUser = {
  id: 'user-1',
  email: 'a12345@ualg.pt',
  role: 'STUDENT',
  createdAt: new Date(),
};

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMocks.map.clear();
  });

  it('creates a session record with a hashed token and 30-day expiry', async () => {
    prismaMocks.session.create.mockResolvedValue({});
    const before = Date.now();
    await createSession('user-1');
    const call = prismaMocks.session.create.mock.calls[0][0];
    expect(call.data.userId).toBe('user-1');
    expect(call.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + SESSION_DURATION_MS - 1000
    );
    expect(call.data.expiresAt.getTime()).toBeLessThanOrEqual(
      before + SESSION_DURATION_MS + 1000
    );
    expect(call.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stores the hash, not the raw token', async () => {
    prismaMocks.session.create.mockResolvedValue({});
    const rawToken = await createSession('user-1');
    const stored = prismaMocks.session.create.mock.calls[0][0].data.tokenHash;
    expect(stored).not.toBe(rawToken);
    expect(crypto.createHash('sha256').update(rawToken).digest('hex')).toBe(
      stored
    );
  });

  it('sets an httpOnly sameSite lax cookie', async () => {
    prismaMocks.session.create.mockResolvedValue({});
    const rawToken = await createSession('user-1');
    expect(cookieMocks.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      rawToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });

  it('sets secure=true and priority high with the __Host- prefix', async () => {
    prismaMocks.session.create.mockResolvedValue({});
    await createSession('user-1');
    expect(SESSION_COOKIE_NAME).toMatch(/^__Host-/);
    const opts = cookieMocks.options.get(SESSION_COOKIE_NAME);
    expect(opts?.secure).toBe(true);
    expect(opts?.priority).toBe('high');
  });

  it('returns the raw token', async () => {
    prismaMocks.session.create.mockResolvedValue({});
    const rawToken = await createSession('user-1');
    expect(typeof rawToken).toBe('string');
    expect(rawToken).toHaveLength(64);
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMocks.map.clear();
  });

  it('returns null when there is no session cookie', async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prismaMocks.session.findUnique).not.toHaveBeenCalled();
  });

  it('looks up the session by hashed token', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, {
      value: 'raw-token-value',
    });
    prismaMocks.session.findUnique.mockResolvedValue({
      user: validUser,
      expiresAt: new Date(Date.now() + 100000),
    });
    const user = await getCurrentUser();
    expect(user).toEqual(validUser);
    const where = prismaMocks.session.findUnique.mock.calls[0][0].where;
    expect(where.tokenHash).toBe(
      crypto.createHash('sha256').update('raw-token-value').digest('hex')
    );
  });

  it('returns the user when the session is not expired', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.findUnique.mockResolvedValue({
      user: validUser,
      expiresAt: new Date(Date.now() + 100000),
    });
    await expect(getCurrentUser()).resolves.toEqual(validUser);
  });

  it('returns null when the session record does not exist', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.findUnique.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('returns null when the session is expired', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.findUnique.mockResolvedValue({
      user: validUser,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('returns null when the database throws', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.findUnique.mockRejectedValue(new Error('db down'));
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('destroySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMocks.map.clear();
  });

  it('deletes the session and clears the cookie when present', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.deleteMany.mockResolvedValue({ count: 1 });
    await destroySession();
    expect(prismaMocks.session.deleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: crypto.createHash('sha256').update('tok').digest('hex'),
      },
    });
    expect(cookieMocks.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it('still clears the cookie when there is no session token', async () => {
    await destroySession();
    expect(prismaMocks.session.deleteMany).not.toHaveBeenCalled();
    expect(cookieMocks.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it('does not throw when the database delete fails', async () => {
    cookieMocks.map.set(SESSION_COOKIE_NAME, { value: 'tok' });
    prismaMocks.session.deleteMany.mockRejectedValue(new Error('db down'));
    await expect(destroySession()).resolves.toBeUndefined();
  });
});
