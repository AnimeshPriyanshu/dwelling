import { describe, expect, it } from 'vitest';
import { validateEnv } from '../../src/config/validateEnv.js';

describe('validateEnv', () => {
  it('passes when all required environment variables are present', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: 'test-secret-value',
      })
    ).not.toThrow();
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() => validateEnv({})).toThrow(
      'Missing required environment variable(s): JWT_SECRET'
    );
  });

  it('throws when JWT_SECRET is empty', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: '',
      })
    ).toThrow('Missing required environment variable(s): JWT_SECRET');
  });

  it('throws when JWT_SECRET contains only whitespace', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: '   ',
      })
    ).toThrow('Missing required environment variable(s): JWT_SECRET');
  });

  it('does not expose secret values in error messages', () => {
    const secret = 'sensitive-production-secret';

    try {
      validateEnv({
        JWT_SECRET: '',
      });
    } catch (error) {
      expect(error.message).not.toContain(secret);
      expect(error.message).toContain('JWT_SECRET');
    }
  });
});
