import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'me-test-secret-with-at-least-32-characters';

// env.js reads process.env at import time; this runs before the imports below.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'me-test-secret-with-at-least-32-characters';
});

// The route is exercised end-to-end through Express, but Prisma is replaced so
// these tests need no PostgreSQL instance (TEST_DATABASE_URL).
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { user: { findUnique } },
}));

import app from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { JWT_ALGORITHM, signSessionToken } from '../../src/auth/jwt.js';

const AUTH_REQUIRED = {
  code: 'AUTH_REQUIRED',
  message: 'Authentication required.',
};

const STORED_USER = {
  id: 'user_1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function validToken(userId = STORED_USER.id) {
  return signSessionToken(userId, { secret: TEST_SECRET });
}

function expiredToken(userId = STORED_USER.id) {
  return jwt.sign({ sub: userId }, TEST_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: -10,
  });
}

beforeEach(() => {
  findUnique.mockReset();
  findUnique.mockResolvedValue(STORED_USER);
});

describe('GET /api/auth/me', () => {
  it('returns 200 with only safe public user fields', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(['user']);
    expect(Object.keys(response.body.user).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
    ]);
    expect(response.body.user).toEqual({
      id: STORED_USER.id,
      email: STORED_USER.email,
      displayName: STORED_USER.displayName,
      createdAt: STORED_USER.createdAt.toISOString(),
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('loads the user from the token subject and selects no secrets', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(validToken('user_42')));

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user_42' },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });
  });

  it('resolves the caller from the cookie, not from the query string', async () => {
    const response = await request(app)
      .get('/api/auth/me?userId=someone_else')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: STORED_USER.id } })
    );
  });

  it('returns 401 when the session cookie is missing', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed session', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie('not-a-jwt'));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired session', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(expiredToken()));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with another secret', async () => {
    const token = signSessionToken(STORED_USER.id, { secret: 'other-secret' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 401, not 500, when the user was deleted after the token was issued', async () => {
    findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
  });
});
