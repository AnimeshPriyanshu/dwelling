import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'contacts-route-test-secret-with-at-least-32-characters';

vi.hoisted(() => {
  process.env.JWT_SECRET =
    'contacts-route-test-secret-with-at-least-32-characters';
});

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { contact: { findMany } },
}));

import app from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { JWT_ALGORITHM, signSessionToken } from '../../src/auth/jwt.js';

const AUTH_REQUIRED = {
  code: 'AUTH_REQUIRED',
  message: 'Authentication required.',
};

const STORED_USER_ID = 'user_1';

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function validToken(userId = STORED_USER_ID) {
  return signSessionToken(userId, { secret: TEST_SECRET });
}

function expiredToken(userId = STORED_USER_ID) {
  return jwt.sign({ sub: userId }, TEST_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: -10,
  });
}

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

describe('GET /api/contacts', () => {
  it('returns 200 with the exact response shape for an authenticated user', async () => {
    findMany.mockResolvedValueOnce([
      { contact: { id: 'user_2', displayName: 'Bo' } },
    ]);

    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contacts: [{ user: { id: 'user_2', displayName: 'Bo' } }],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: STORED_USER_ID } })
    );
  });

  it('returns 200 with an empty contacts array', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ contacts: [] });
  });

  it('returns 401 when the session cookie is missing', async () => {
    const response = await request(app).get('/api/contacts');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed session', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie('not-a-jwt'));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired session', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie(expiredToken()));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with another secret', async () => {
    const token = signSessionToken(STORED_USER_ID, {
      secret: 'other-secret-with-at-least-32-characters',
    });

    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('ignores a userId query parameter and uses the session user', async () => {
    const response = await request(app)
      .get('/api/contacts?userId=someone_else')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: STORED_USER_ID } })
    );
  });

  it('returns a sanitized 500 when the database fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    findMany.mockRejectedValue(
      new Error('postgresql://user:hunter2@db.internal:5432/dwelling')
    );

    try {
      const response = await request(app)
        .get('/api/contacts')
        .set('Cookie', sessionCookie(validToken()));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 'INTERNAL',
        message: 'Internal server error',
      });
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('hunter2');
      expect(serialized).not.toContain('db.internal');
      expect(serialized).not.toContain('postgresql://');
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('does not leak private user fields into the response', async () => {
    findMany.mockResolvedValueOnce([
      {
        contact: {
          id: 'user_2',
          displayName: 'Bo',
          email: 'bo@example.com',
          passwordHash: 'secret',
          createdAt: new Date(),
        },
      },
    ]);

    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', sessionCookie(validToken()));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contacts: [{ user: { id: 'user_2', displayName: 'Bo' } }],
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('createdAt');
  });
});
