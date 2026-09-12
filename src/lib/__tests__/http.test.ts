import { describe, it, expect, afterEach, vi } from 'vitest';
import { clientFacingError } from '@/lib/http';

describe('clientFacingError', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns detailed messages outside production', () => {
    expect(clientFacingError(new Error('db down'), 'zbum!')).toBe('db down');
    expect(clientFacingError('SMTP offline', 'zbum!')).toBe('SMTP offline');
    expect(clientFacingError(undefined, 'zbum!')).toBe('zbum!');
    expect(clientFacingError('', 'zbum!')).toBe('zbum!');
  });

  it('never exposes internal exception text in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(
      clientFacingError(new Error('connection string leaked!'), 'zbum!')
    ).toBe('zbum!');
    expect(clientFacingError('SMTP offline', 'zbum!')).toBe('zbum!');
  });
});
