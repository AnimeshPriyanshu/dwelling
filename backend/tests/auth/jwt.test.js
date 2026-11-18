import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  JWT_ALGORITHM,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
} from '../../src/auth/jwt.js';

const SECRET = 'unit-test-secret';

/** Crafts a token directly, bypassing signSessionToken's input guards. */
function craftToken(payload, { secret = SECRET, expiresIn } = {}) {
  return jwt.sign(payload, secret, {
    algorithm: JWT_ALGORITHM,
    ...(expiresIn === undefined ? {} : { expiresIn }),
  });
}

describe('jwt utilities', () => {
  it('signs and verifies a token for a user', () => {
    const token = signSessionToken('user_123', { secret: SECRET });

    expect(verifySessionToken(token, { secret: SECRET })).toEqual({
      valid: true,
      userId: 'user_123',
    });
  });

  it('uses a seven-day lifetime', () => {
    expect(SESSION_TTL_SECONDS).toBe(604800);

    const token = signSessionToken('user_123', { secret: SECRET });
    const decoded = jwt.decode(token);

    expect(decoded.exp - decoded.iat).toBe(SESSION_TTL_SECONDS);
  });

  it('carries only sub, iat and exp', () => {
    const token = signSessionToken('user_123', { secret: SECRET });
    const decoded = jwt.decode(token);

    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(decoded.sub).toBe('user_123');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSessionToken('user_123', { secret: 'other-secret' });

    expect(verifySessionToken(token, { secret: SECRET })).toEqual({
      valid: false,
    });
  });

  it('rejects an expired token', () => {
    const token = craftToken({ sub: 'user_123' }, { expiresIn: -10 });

    expect(verifySessionToken(token, { secret: SECRET })).toEqual({
      valid: false,
    });
  });

  it('rejects malformed and empty tokens', () => {
    for (const token of ['', 'not-a-token', 'a.b.c', 'Bearer abc', null, 42]) {
      expect(verifySessionToken(token, { secret: SECRET })).toEqual({
        valid: false,
      });
    }
  });

  it('rejects a token without a subject', () => {
    expect(verifySessionToken(craftToken({}), { secret: SECRET })).toEqual({
      valid: false,
    });
    expect(
      verifySessionToken(craftToken({ sub: '' }), { secret: SECRET })
    ).toEqual({ valid: false });
    expect(
      verifySessionToken(craftToken({ sub: 123 }), { secret: SECRET })
    ).toEqual({ valid: false });
  });

  it('rejects verification when no secret is configured', () => {
    const token = signSessionToken('user_123', { secret: SECRET });

    expect(verifySessionToken(token, {})).toEqual({ valid: false });
    expect(verifySessionToken(token, { secret: '   ' })).toEqual({
      valid: false,
    });
  });

  it('refuses to sign with missing configuration or identity', () => {
    expect(() => signSessionToken('user_123')).toThrow(
      'JWT_SECRET is not configured.'
    );
    expect(() => signSessionToken('', { secret: SECRET })).toThrow(TypeError);
    expect(() => signSessionToken(123, { secret: SECRET })).toThrow(TypeError);
    expect(() =>
      signSessionToken('user_123', { secret: SECRET, expiresInSeconds: 0 })
    ).toThrow(RangeError);
  });
});
