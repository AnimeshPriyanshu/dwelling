import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const TEST_SECRET = 'session-flow-test-secret-with-32-characters';

// env.js reads process.env at import time; this runs before the imports below.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'session-flow-test-secret-with-32-characters';
});

// A stateful in-memory stand-in for the Prisma User model. The per-endpoint
// suites mock one operation at a time; the lifecycle below needs signup, login
// and `/auth/me` to see the same rows, without requiring TEST_DATABASE_URL.
const { users, create, findUnique } = vi.hoisted(() => ({
  users: new Map(),
  create: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { user: { create, findUnique } },
}));

import { createApp } from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { env } from '../../src/config/env.js';
import { createAuthRateLimiter } from '../../src/middleware/rateLimit.js';

// Every state-changing request must carry the configured origin (PR-27).
const ALLOWED_ORIGIN = env.clientOrigin;
const PASSWORD = 'correct horse battery';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

const SIGNUP_PAYLOAD = {
  email: '  Ada@Example.COM ',
  password: PASSWORD,
  displayName: '  Ada  ',
};

// A fresh app per test keeps the stricter credential limiter from accumulating
// hits across the suite.
let app;

function publicUser(record) {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt,
  };
}

/** Returns the `name=value` pair a browser would send back. */
function sessionCookieFrom(response) {
  const header = response.headers['set-cookie']?.[0];
  expect(header).toBeDefined();
  return header.split(';')[0];
}

function clearedCookieFrom(response) {
  const header = response.headers['set-cookie']?.[0];
  expect(header).toBeDefined();
  return header;
}

function signup(payload = SIGNUP_PAYLOAD) {
  return request(app)
    .post('/api/signup')
    .set('Origin', ALLOWED_ORIGIN)
    .send(payload);
}

function login(payload) {
  return request(app)
    .post('/api/auth/login')
    .set('Origin', ALLOWED_ORIGIN)
    .send(payload);
}

function me(cookie) {
  return request(app).get('/api/auth/me').set('Cookie', cookie);
}

function logout(cookie) {
  const pending = request(app)
    .post('/api/auth/logout')
    .set('Origin', ALLOWED_ORIGIN);

  return cookie ? pending.set('Cookie', cookie) : pending;
}

beforeEach(() => {
  users.clear();
  create.mockReset();
  findUnique.mockReset();

  create.mockImplementation(async ({ data }) => {
    const duplicate = [...users.values()].some(
      (user) => user.email === data.email
    );

    if (duplicate) {
      throw Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
    }

    const record = {
      id: `user_${users.size + 1}`,
      createdAt: CREATED_AT,
      ...data,
    };
    users.set(record.id, record);

    return publicUser(record);
  });

  findUnique.mockImplementation(async ({ where, select = {} }) => {
    const record = where.id
      ? users.get(where.id)
      : [...users.values()].find((user) => user.email === where.email);

    if (!record) {
      return null;
    }

    const user = publicUser(record);
    return select.passwordHash
      ? { ...user, passwordHash: record.passwordHash }
      : user;
  });

  app = createApp({ credentialLimiter: createAuthRateLimiter() });
});

describe('auth session lifecycle', () => {
  it('signs a new account in and accepts the issued cookie on /api/auth/me', async () => {
    const created = await signup();

    expect(created.status).toBe(201);
    expect(env.jwtSecret).toBe(TEST_SECRET);
    const session = await me(sessionCookieFrom(created));

    expect(session.status).toBe(200);
    expect(session.body.user).toMatchObject({
      id: created.body.user.id,
      email: 'ada@example.com',
      displayName: 'Ada',
    });
    expect(Object.keys(session.body.user).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
    ]);
    // `/auth/me` reads the session; it never reissues the cookie.
    expect(session.headers['set-cookie']).toBeUndefined();
  });

  it('accepts a cookie issued by login exactly like one issued by signup', async () => {
    const created = await signup();
    const loggedIn = await login({
      email: 'ada@example.com',
      password: PASSWORD,
    });

    expect(loggedIn.status).toBe(200);

    const session = await me(sessionCookieFrom(loggedIn));
    expect(session.status).toBe(200);
    expect(session.body.user.id).toBe(created.body.user.id);
  });

  it('keeps the existing session when a later login fails', async () => {
    const created = await signup();
    const cookie = sessionCookieFrom(created);

    const failed = await login({
      email: 'ada@example.com',
      password: 'the wrong password',
    });

    expect(failed.status).toBe(401);
    expect(failed.headers['set-cookie']).toBeUndefined();
    expect((await me(cookie)).status).toBe(200);
  });

  it('answers 401 when the browser sends the cleared cookie value', async () => {
    const created = await signup();

    const cleared = await logout(sessionCookieFrom(created));

    expect(cleared.status).toBe(204);
    expect(clearedCookieFrom(cleared)).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(clearedCookieFrom(cleared)).toContain('Max-Age=0');

    const afterLogout = await me(`${SESSION_COOKIE_NAME}=`);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Authentication required.',
    });
  });

  it('does not revoke the already-issued token (ADR-0022)', async () => {
    const created = await signup();
    const cookie = sessionCookieFrom(created);

    await logout(cookie);

    // Logout only removes the browser cookie; the stateless JWT stays valid
    // until `exp`. This pins the documented contract rather than implying
    // server-side revocation.
    expect((await me(cookie)).status).toBe(200);
  });

  it('is idempotent and clears exactly one cookie each time', async () => {
    const answers = [await logout(), await logout()];

    for (const response of answers) {
      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(response.headers['set-cookie']).toHaveLength(1);
      expect(clearedCookieFrom(response)).toContain('Max-Age=0');
    }
  });

  it('refuses a second account for the same address regardless of case', async () => {
    await signup();

    const duplicate = await signup({
      ...SIGNUP_PAYLOAD,
      email: 'ADA@EXAMPLE.COM',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      code: 'EMAIL_TAKEN',
      message: expect.any(String),
    });
    expect(duplicate.headers['set-cookie']).toBeUndefined();
    expect(users.size).toBe(1);
  });

  it('never exposes the session token, password, or hash in a response body', async () => {
    const created = await signup();
    const cookie = sessionCookieFrom(created);
    const token = cookie.slice(SESSION_COOKIE_NAME.length + 1);

    const session = await me(cookie);
    const loggedIn = await login({
      email: 'ada@example.com',
      password: PASSWORD,
    });

    const serialized = JSON.stringify([
      created.body,
      session.body,
      loggedIn.body,
    ]);

    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toContain('passwordHash');
  });
});
