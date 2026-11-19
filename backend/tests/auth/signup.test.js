import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { compare } from '@dwelling/shared';

const TEST_SECRET = 'signup-test-secret-with-at-least-32-characters';

// env.js reads process.env at import time; this runs before the imports below.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'signup-test-secret-with-at-least-32-characters';
});

// The signup route is exercised end-to-end through Express, but Prisma is
// replaced so these tests need no PostgreSQL instance (TEST_DATABASE_URL).
const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { user: { create } },
}));

import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import {
  MAXIMUM_PASSWORD_BYTES,
  validateSignupInput,
} from '../../src/auth/validation.js';

const VALID_PAYLOAD = {
  email: '  Ada@Example.COM ',
  password: 'correct horse battery',
  displayName: '  Ada  ',
};

const CREATED_USER = {
  id: 'user_1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createdUserFrom({ data }) {
  return {
    id: CREATED_USER.id,
    email: data.email,
    displayName: data.displayName,
    createdAt: CREATED_USER.createdAt,
  };
}

function sessionTokenFrom(response) {
  const header = response.headers['set-cookie']?.[0];
  expect(header).toBeDefined();
  const [pair] = header.split(';');
  const [name, value] = pair.split('=');
  expect(name).toBe(SESSION_COOKIE_NAME);
  return value;
}

beforeEach(() => {
  create.mockReset();
  create.mockImplementation(async (args) => createdUserFrom(args));
});

describe('POST /api/signup', () => {
  it('creates a user and returns 201 with only public fields', async () => {
    const response = await request(app).post('/api/signup').send(VALID_PAYLOAD);

    expect(response.status).toBe(201);
    expect(Object.keys(response.body)).toEqual(['user']);
    expect(Object.keys(response.body.user).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
    ]);
    expect(response.body.user).toMatchObject({
      id: CREATED_USER.id,
      email: 'ada@example.com',
      displayName: 'Ada',
    });
    expect(JSON.stringify(response.body)).not.toContain(VALID_PAYLOAD.password);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('normalizes email and display name before writing to the database', async () => {
    await request(app).post('/api/signup').send(VALID_PAYLOAD);

    expect(create).toHaveBeenCalledTimes(1);
    const [{ data }] = create.mock.calls[0];
    expect(data.email).toBe('ada@example.com');
    expect(data.displayName).toBe('Ada');
  });

  it('hashes the password and never stores or returns plaintext', async () => {
    await request(app).post('/api/signup').send(VALID_PAYLOAD);

    const [{ data }] = create.mock.calls[0];
    expect(data.passwordHash).not.toBe(VALID_PAYLOAD.password);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(
      compare(VALID_PAYLOAD.password, data.passwordHash)
    ).resolves.toBe(true);
  });

  it('writes exactly the fields defined on the Prisma User model', async () => {
    await request(app).post('/api/signup').send(VALID_PAYLOAD);

    const [{ data, select }] = create.mock.calls[0];
    expect(Object.keys(data).sort()).toEqual([
      'displayName',
      'email',
      'passwordHash',
    ]);
    expect(select).toEqual({
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
    });
  });

  it('signs the session JWT with the configured JWT_SECRET', async () => {
    const response = await request(app).post('/api/signup').send(VALID_PAYLOAD);

    expect(env.jwtSecret).toBe(TEST_SECRET);
    const token = sessionTokenFrom(response);
    const payload = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] });
    expect(payload.sub).toBe(CREATED_USER.id);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  it('sets an HttpOnly session cookie with the expected attributes', async () => {
    const response = await request(app).post('/api/signup').send(VALID_PAYLOAD);

    const header = response.headers['set-cookie'][0];
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Max-Age=604800');
    // Tests run with NODE_ENV=test, not production.
    expect(header).not.toContain('Secure');
  });

  it('returns 400 for a whitespace-only password', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({ ...VALID_PAYLOAD, password: '        ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts and hashes a password with leading and trailing spaces unchanged', async () => {
    const password = '  spaced password  ';

    const response = await request(app)
      .post('/api/signup')
      .send({ ...VALID_PAYLOAD, password });

    expect(response.status).toBe(201);
    const [{ data }] = create.mock.calls[0];
    await expect(compare(password, data.passwordHash)).resolves.toBe(true);
    // Proves the value was not trimmed before hashing.
    await expect(compare(password.trim(), data.passwordHash)).resolves.toBe(
      false
    );
  });

  it('returns 409 when the email already exists', async () => {
    create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    );

    const response = await request(app).post('/api/signup').send(VALID_PAYLOAD);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      code: 'EMAIL_TAKEN',
      message: expect.any(String),
    });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('P2002');
    expect(JSON.stringify(response.body)).not.toContain('Unique constraint');
  });

  it.each([
    ['missing password', { ...VALID_PAYLOAD, password: undefined }],
    ['short password', { ...VALID_PAYLOAD, password: 'short' }],
    ['invalid email', { ...VALID_PAYLOAD, email: 'not-an-email' }],
    ['missing display name', { ...VALID_PAYLOAD, displayName: undefined }],
    ['unknown field', { ...VALID_PAYLOAD, role: 'admin' }],
  ])('returns 400 VALIDATION_FAILED for %s', async (_label, payload) => {
    const response = await request(app).post('/api/signup').send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('returns a generic 500 without leaking internals for unexpected errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    create.mockRejectedValue(
      new Error('postgresql://user:hunter2@db.internal:5432/dwelling')
    );

    try {
      const response = await request(app)
        .post('/api/signup')
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
      // The full error is logged server-side only.
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('validateSignupInput', () => {
  it('trims and lowercases the email', () => {
    expect(validateSignupInput(VALID_PAYLOAD).email).toBe('ada@example.com');
  });

  it('trims the display name', () => {
    expect(validateSignupInput(VALID_PAYLOAD).displayName).toBe('Ada');
  });

  it('rejects non-object bodies', () => {
    for (const body of [null, [], 'string', 42]) {
      expect(() => validateSignupInput(body)).toThrow(
        'Request body is invalid.'
      );
    }
  });

  it('accepts a password at the minimum length', () => {
    expect(
      validateSignupInput({ ...VALID_PAYLOAD, password: '12345678' }).password
    ).toBe('12345678');
  });

  it('accepts a password of exactly 72 ASCII bytes', () => {
    const password = 'a'.repeat(MAXIMUM_PASSWORD_BYTES);

    expect(validateSignupInput({ ...VALID_PAYLOAD, password }).password).toBe(
      password
    );
  });

  it('rejects a password longer than 72 bytes even when characters fit', () => {
    // 37 two-byte characters = 74 bytes.
    const password = 'é'.repeat(37);

    expect(password.length).toBeLessThan(MAXIMUM_PASSWORD_BYTES);
    expect(() => validateSignupInput({ ...VALID_PAYLOAD, password })).toThrow(
      'Request body is invalid.'
    );
  });
});
