import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { hash } from '@dwelling/shared';

const TEST_SECRET = 'login-test-secret-with-at-least-32-characters';

// env.js reads process.env at import time; this runs before the imports below.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'login-test-secret-with-at-least-32-characters';
});

// The login route is exercised end-to-end through Express, but Prisma is
// replaced so these tests need no PostgreSQL instance (TEST_DATABASE_URL).
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { user: { findUnique } },
}));

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { createAuthRateLimiter } from '../../src/middleware/rateLimit.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { SESSION_TTL_SECONDS } from '../../src/auth/jwt.js';
import { MAXIMUM_PASSWORD_BYTES } from '../../src/auth/validation.js';

// Every state-changing request must carry the configured origin (PR-27).
const ALLOWED_ORIGIN = env.clientOrigin;

// A fresh app per test keeps the stricter auth rate limiter from accumulating
// hits across the suite; the limit itself is unchanged.
let app;

const PASSWORD = 'correct horse battery';
const VALID_PAYLOAD = {
  email: '  Ada@Example.COM ',
  password: PASSWORD,
};

const INVALID_CREDENTIALS = {
  code: 'INVALID_CREDENTIALS',
  message: 'Invalid email or password.',
};

const STORED_USER = {
  id: 'user_1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: '',
};

function sessionTokenFrom(response) {
  const header = response.headers['set-cookie']?.[0];
  expect(header).toBeDefined();
  const [pair] = header.split(';');
  const [name, value] = pair.split('=');
  expect(name).toBe(SESSION_COOKIE_NAME);
  return value;
}

beforeEach(async () => {
  app = createApp({ credentialLimiter: createAuthRateLimiter() });
  findUnique.mockReset();
  findUnique.mockResolvedValue({
    ...STORED_USER,
    passwordHash: await hash(PASSWORD),
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with only safe public user fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(['user']);
    expect(Object.keys(response.body.user).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
    ]);
    expect(response.body.user).toMatchObject({
      id: STORED_USER.id,
      email: STORED_USER.email,
      displayName: STORED_USER.displayName,
    });
  });

  it('never returns the password, password hash, or JWT in the body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain(sessionTokenFrom(response));
  });

  it('normalizes the email before looking the user up', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        passwordHash: true,
      },
    });
  });

  it('verifies the password against the stored hash', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    expect(response.status).toBe(200);
  });

  it('does not trim the password before verification', async () => {
    const spacedPassword = '  spaced password  ';
    findUnique.mockResolvedValue({
      ...STORED_USER,
      passwordHash: await hash(spacedPassword),
    });

    const accepted = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ email: STORED_USER.email, password: spacedPassword });
    const rejected = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ email: STORED_USER.email, password: spacedPassword.trim() });

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(401);
  });

  it('signs a session JWT with the configured secret and seven-day lifetime', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    expect(env.jwtSecret).toBe(TEST_SECRET);
    const token = sessionTokenFrom(response);
    const payload = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] });

    expect(payload.sub).toBe(STORED_USER.id);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.exp - payload.iat).toBe(SESSION_TTL_SECONDS);
  });

  it('sets an HttpOnly session cookie with the documented attributes', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    const header = response.headers['set-cookie'][0];
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Max-Age=604800');
    // Tests run with NODE_ENV=test, not production.
    expect(header).not.toContain('Secure');
  });

  it('returns the same generic 401 for an unknown email and a wrong password', async () => {
    findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ email: 'nobody@example.com', password: PASSWORD });

    findUnique.mockResolvedValueOnce({
      ...STORED_USER,
      passwordHash: await hash('a different password'),
    });
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(VALID_PAYLOAD);

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body).toEqual(INVALID_CREDENTIALS);
    expect(wrongPassword.body).toEqual(INVALID_CREDENTIALS);
    expect(unknownEmail.text).toBe(wrongPassword.text);
    expect(unknownEmail.headers['set-cookie']).toBeUndefined();
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('accepts a short wrong password as a credential mismatch, not a validation error', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ email: STORED_USER.email, password: 'short' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS);
  });

  it.each([
    ['missing email', { password: PASSWORD }],
    ['missing password', { email: STORED_USER.email }],
    ['malformed email', { email: 'not-an-email', password: PASSWORD }],
    ['non-string email', { email: 42, password: PASSWORD }],
    ['non-string password', { email: STORED_USER.email, password: 42 }],
    ['null password', { email: STORED_USER.email, password: null }],
    ['empty password', { email: STORED_USER.email, password: '' }],
    [
      'whitespace-only password',
      { email: STORED_USER.email, password: '        ' },
    ],
    ['whitespace-only email', { email: '   ', password: PASSWORD }],
    ['unknown field', { ...VALID_PAYLOAD, displayName: 'Ada' }],
    [
      'password over 72 UTF-8 bytes',
      { email: STORED_USER.email, password: 'é'.repeat(37) },
    ],
  ])('returns 400 VALIDATION_FAILED for %s', async (_label, payload) => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_REQUEST for a malformed JSON body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{"email": "ada@example.com",');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'BAD_REQUEST',
      message: 'Malformed JSON request body',
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('accepts a password of exactly 72 ASCII bytes as a credential attempt', async () => {
    const password = 'a'.repeat(MAXIMUM_PASSWORD_BYTES);
    findUnique.mockResolvedValue({
      ...STORED_USER,
      passwordHash: await hash(password),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ email: STORED_USER.email, password });

    expect(response.status).toBe(200);
  });

  it('returns a sanitized 500 when the database fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    findUnique.mockRejectedValue(
      new Error('postgresql://user:hunter2@db.internal:5432/dwelling')
    );

    try {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', ALLOWED_ORIGIN)
        .send(VALID_PAYLOAD);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 'INTERNAL',
        message: 'Internal server error',
      });
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('hunter2');
      expect(serialized).not.toContain('db.internal');
      expect(serialized).not.toContain('postgresql://');
      expect(response.headers['set-cookie']).toBeUndefined();
      // The full error is logged server-side only.
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
