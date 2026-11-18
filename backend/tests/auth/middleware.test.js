import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { JWT_ALGORITHM, signSessionToken } from '../../src/auth/jwt.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { createRequireAuth } from '../../src/auth/middleware.js';

const SECRET = 'unit-test-secret';
const AUTH_REQUIRED = {
  code: 'AUTH_REQUIRED',
  message: 'Authentication required.',
};

/**
 * A throwaway app with one protected route. This exercises the real
 * cookie-parser → middleware path without adding a route to the application.
 */
function buildApp(
  handler = (req, res) => res.json({ userId: req.auth.userId })
) {
  const app = express();
  app.use(cookieParser());
  app.get('/protected', createRequireAuth({ secret: SECRET }), handler);
  return app;
}

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function expiredToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: -10,
  });
}

describe('auth middleware', () => {
  it('accepts a valid session and attaches the user id', async () => {
    const token = signSessionToken('user_123', { secret: SECRET });

    const response = await request(buildApp())
      .get('/protected')
      .set('Cookie', sessionCookie(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 'user_123' });
  });

  it('rejects a request with no session cookie', async () => {
    const response = await request(buildApp()).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
  });

  it('rejects a malformed session cookie', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('Cookie', sessionCookie('not-a-jwt'));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
  });

  it('rejects an expired session', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('Cookie', sessionCookie(expiredToken('user_123')));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
  });

  it('rejects a token signed with another secret', async () => {
    const token = signSessionToken('user_123', { secret: 'other-secret' });

    const response = await request(buildApp())
      .get('/protected')
      .set('Cookie', sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
  });

  it('does not call the handler when the session is missing', async () => {
    const handler = vi.fn((_req, res) => res.json({ ok: true }));

    await request(buildApp(handler)).get('/protected');

    expect(handler).not.toHaveBeenCalled();
  });

  it('shares one response body for missing, invalid and expired sessions', async () => {
    const app = buildApp();
    const token = signSessionToken('user_123', { secret: SECRET });

    const missing = await request(app).get('/protected');
    const invalid = await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie('garbage'));
    const expired = await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(expiredToken('user_123')));

    expect(new Set([missing.text, invalid.text, expired.text]).size).toBe(1);
    expect(invalid.text).not.toContain('expired');
    expect(invalid.text).not.toContain(token);
  });

  it('accepts a custom cookie name', async () => {
    const app = express();
    app.use(cookieParser());
    app.get(
      '/protected',
      createRequireAuth({ secret: SECRET, cookieName: 'other_session' }),
      (req, res) => res.json({ userId: req.auth.userId })
    );

    const response = await request(app)
      .get('/protected')
      .set(
        'Cookie',
        `other_session=${signSessionToken('user_9', { secret: SECRET })}`
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 'user_9' });
  });
});
