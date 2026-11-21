import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const TEST_SECRET = 'contacts-route-test-secret-at-least-32-chars';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'contacts-route-test-secret-at-least-32-chars';
});

const { userFindUnique, contactCreateMany, contactFindMany } = vi.hoisted(
  () => ({
    userFindUnique: vi.fn(),
    contactCreateMany: vi.fn(),
    contactFindMany: vi.fn(),
  })
);

vi.mock('../../src/db/prisma.js', () => {
  const prisma = {
    user: { findUnique: userFindUnique },
    contact: { createMany: contactCreateMany, findMany: contactFindMany },
  };
  prisma.$transaction = vi.fn(async (callback) => callback(prisma));

  return { prisma };
});

import { createApp } from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { signSessionToken } from '../../src/auth/jwt.js';
import { createAuthRateLimiter } from '../../src/middleware/rateLimit.js';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const ORIGIN = 'http://localhost:5173';

const PEER = { id: BOB, displayName: 'Bo' };

let app;

function send(
  body,
  { token = signSessionToken(ALICE, { secret: TEST_SECRET }) } = {}
) {
  const call = request(app).post('/api/contacts').set('Origin', ORIGIN);

  if (token) {
    call.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
  }

  return call.send(body);
}

beforeEach(() => {
  app = createApp({ credentialLimiter: createAuthRateLimiter() });
  userFindUnique.mockReset();
  contactCreateMany.mockReset();
  contactFindMany.mockReset();

  userFindUnique.mockResolvedValue({ id: BOB, displayName: 'Bo' });
  contactCreateMany.mockResolvedValue({ count: 2 });
});

describe('POST /api/contacts', () => {
  it('creates a mutual relationship and returns 201 { contact: { user } }', async () => {
    const response = await send({ userId: BOB });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ contact: { user: PEER } });

    const [{ data }] = contactCreateMany.mock.calls[0];
    expect(data).toEqual([
      { userId: ALICE, contactId: BOB },
      { userId: BOB, contactId: ALICE },
    ]);
  });

  it('returns 200 when the relationship already exists', async () => {
    contactCreateMany.mockResolvedValue({ count: 0 });

    const response = await send({ userId: BOB });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ contact: { user: PEER } });
  });

  it('trims the peer id before use', async () => {
    await send({ userId: `  ${BOB}  ` });

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: BOB },
      select: { id: true, displayName: true },
    });
  });

  it('rejects adding yourself with 400 SELF_CONTACT', async () => {
    const response = await send({ userId: ALICE });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SELF_CONTACT');
    expect(contactCreateMany).not.toHaveBeenCalled();
  });

  it('returns 404 USER_NOT_FOUND for an unknown user id', async () => {
    userFindUnique.mockResolvedValue(null);

    const response = await send({ userId: 'user_missing' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('USER_NOT_FOUND');
    expect(contactCreateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['missing userId', {}],
    ['non-string userId', { userId: 42 }],
    ['blank userId', { userId: '   ' }],
    ['unknown field', { userId: BOB, email: 'bo@example.com' }],
    ['oversized userId', { userId: 'x'.repeat(65) }],
  ])('returns 400 VALIDATION_FAILED for %s', async (_label, body) => {
    const response = await send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('requires a session', async () => {
    const response = await send({ userId: BOB }, { token: null });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('rejects a foreign Origin before touching the database', async () => {
    const response = await request(app)
      .post('/api/contacts')
      .set('Origin', 'https://evil.example')
      .set(
        'Cookie',
        `${SESSION_COOKIE_NAME}=${signSessionToken(ALICE, { secret: TEST_SECRET })}`
      )
      .send({ userId: BOB });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');
    expect(contactCreateMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/contacts', () => {
  it('returns only the caller-directed peer projection', async () => {
    contactFindMany.mockResolvedValue([
      { contact: { id: BOB, displayName: 'Bo' } },
    ]);

    const response = await request(app)
      .get('/api/contacts')
      .set(
        'Cookie',
        `${SESSION_COOKIE_NAME}=${signSessionToken(ALICE, { secret: TEST_SECRET })}`
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ contacts: [{ user: PEER }] });
    expect(JSON.stringify(response.body)).not.toContain('email');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
});
