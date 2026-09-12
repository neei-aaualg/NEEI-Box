import { describe, it, expect, afterEach } from 'vitest';
import { clientFacingError } from '@/lib/http';

describe('clientFacingError', () => {
  const original = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('returns detailed messages outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(clientFacingError(new Error('db down'), 'zbum!')).toBe('db down');
    expect(clientFacingError('SMTP offline', 'zbum!')).toBe('SMTP offline');
    expect(clientFacingError(undefined, 'zbum!')).toBe('zbum!');
    expect(clientFacingError('', 'zbum!')).toBe('zbum!');
  });

  it('never exposes internal exception text in production', () => {
    process.env.NODE_ENV = 'production';
    expect(
      clientFacingError(new Error('connection string leaked!'), 'zbum!')
    ).toBe('zbum!');
    expect(clientFacingError('SMTP offline', 'zbum!')).toBe('zbum!');
  });
});
