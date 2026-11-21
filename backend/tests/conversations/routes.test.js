import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const TEST_SECRET = 'conversations-route-test-secret-32-chars';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'conversations-route-test-secret-32-chars';
});

const {
  userFindUnique,
  contactFindMany,
  conversationFindUnique,
  conversationCreate,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  contactFindMany: vi.fn(),
  conversationFindUnique: vi.fn(),
  conversationCreate: vi.fn(),
}));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    contact: { findMany: contactFindMany },
    conversation: {
      findUnique: conversationFindUnique,
      create: conversationCreate,
    },
  },
}));

import { createApp } from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { signSessionToken } from '../../src/auth/jwt.js';
import { createAuthRateLimiter } from '../../src/middleware/rateLimit.js';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const CAROL = 'user_carol';
const ORIGIN = 'http://localhost:5173';

const STORED_ROW = {
  id: 'conversation_1',
  createdAt: new Date('2026-11-20T09:00:00.000Z'),
  userOne: { id: ALICE, displayName: 'Alice' },
  userTwo: { id: BOB, displayName: 'Bo' },
};

const CONVERSATION = {
  id: 'conversation_1',
  participants: [
    { id: ALICE, displayName: 'Alice' },
    { id: BOB, displayName: 'Bo' },
  ],
  createdAt: STORED_ROW.createdAt.toISOString(),
};

const MUTUAL_EDGES = [
  { userId: ALICE, contactId: BOB },
  { userId: BOB, contactId: ALICE },
];

let app;

function cookie(userId = ALICE) {
  return `${SESSION_COOKIE_NAME}=${signSessionToken(userId, { secret: TEST_SECRET })}`;
}

function create(body, { userId = ALICE } = {}) {
  return request(app)
    .post('/api/conversations')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie(userId))
    .send(body);
}

beforeEach(() => {
  app = createApp({ credentialLimiter: createAuthRateLimiter() });
  userFindUnique.mockReset();
  contactFindMany.mockReset();
  conversationFindUnique.mockReset();
  conversationCreate.mockReset();

  contactFindMany.mockResolvedValue(MUTUAL_EDGES);
  userFindUnique.mockResolvedValue({ id: BOB });
  conversationFindUnique.mockResolvedValue(null);
  conversationCreate.mockResolvedValue(STORED_ROW);
});

describe('POST /api/conversations', () => {
  it('creates the canonical pair and returns 201', async () => {
    const response = await create({ userId: BOB });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ conversation: CONVERSATION });

    const [{ data }] = conversationCreate.mock.calls[0];
    expect(data).toEqual({ userOneId: ALICE, userTwoId: BOB });
  });

  it('derives the same canonical pair whichever side asks', async () => {
    await create({ userId: ALICE }, { userId: BOB });

    const [{ data }] = conversationCreate.mock.calls[0];
    expect(data).toEqual({ userOneId: ALICE, userTwoId: BOB });
  });

  it('returns the existing conversation with 200', async () => {
    conversationFindUnique.mockResolvedValue(STORED_ROW);

    const response = await create({ userId: BOB });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversation: CONVERSATION });
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-mutual contact with 403 NOT_CONTACTS', async () => {
    contactFindMany.mockResolvedValue([{ userId: ALICE, contactId: BOB }]);
    userFindUnique.mockResolvedValue({ id: BOB });

    const response = await create({ userId: BOB });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('NOT_CONTACTS');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('returns 404 USER_NOT_FOUND for an id with no user', async () => {
    contactFindMany.mockResolvedValue([]);
    userFindUnique.mockResolvedValue(null);

    const response = await create({ userId: CAROL });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('USER_NOT_FOUND');
  });

  it('rejects a conversation with yourself', async () => {
    const response = await create({ userId: ALICE });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SELF_CONVERSATION');
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .set('Origin', ORIGIN)
      .send({ userId: BOB });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['missing userId', {}],
    ['blank userId', { userId: '  ' }],
    ['non-string userId', { userId: 7 }],
    ['unknown field', { userId: BOB, conversationId: 'x' }],
  ])('returns 400 VALIDATION_FAILED for %s', async (_label, body) => {
    const response = await create(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
  });
});

describe('GET /api/conversations/:id', () => {
  it('returns the conversation for a participant', async () => {
    conversationFindUnique.mockResolvedValue(STORED_ROW);

    const response = await request(app)
      .get('/api/conversations/conversation_1')
      .set('Cookie', cookie(BOB));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversation: CONVERSATION });
  });

  it('hides the conversation from a non-participant', async () => {
    conversationFindUnique.mockResolvedValue(STORED_ROW);

    const response = await request(app)
      .get('/api/conversations/conversation_1')
      .set('Cookie', cookie(CAROL));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it('returns the same 404 for a missing conversation', async () => {
    conversationFindUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/conversations/missing')
      .set('Cookie', cookie(ALICE));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it('requires authentication', async () => {
    const response = await request(app).get(
      '/api/conversations/conversation_1'
    );

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });
});
