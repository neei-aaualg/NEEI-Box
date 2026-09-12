import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, clientIpFromHeaders } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first requests within the limit', () => {
    for (let i = 0; i < 3; i++) {
      const result = rateLimit('ip-x', 3, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests beyond the limit', () => {
    for (let i = 0; i < 3; i++) rateLimit('ip-x', 3, 60_000);
    const result = rateLimit('ip-x', 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    for (let i = 0; i < 5; i++) rateLimit('key-a', 5, 60_000);
    expect(rateLimit('key-a', 5, 60_000).allowed).toBe(false);
    expect(rateLimit('key-b', 5, 60_000).allowed).toBe(true);
  });

  it('resets the window after it expires', () => {
    rateLimit('ip-x', 1, 60_000);
    expect(rateLimit('ip-x', 1, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimit('ip-x', 1, 60_000).allowed).toBe(true);
  });

  it('never allows when the limit is non-positive', () => {
    expect(rateLimit('ip-x', 0, 60_000).allowed).toBe(false);
  });
});

describe('clientIpFromHeaders', () => {
  it('takes the leftmost x-forwarded-for address', () => {
    expect(
      clientIpFromHeaders(
        new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })
      )
    ).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(clientIpFromHeaders(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe(
      '5.6.7.8'
    );
  });

  it('returns unknown when no address is present', () => {
    expect(clientIpFromHeaders(new Headers())).toBe('unknown');
  });
});
