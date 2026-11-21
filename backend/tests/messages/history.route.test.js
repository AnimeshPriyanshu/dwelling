import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const TEST_SECRET = 'history-route-test-secret-at-least-32chars';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'history-route-test-secret-at-least-32chars';
});

const { conversationFindUnique, messageFindMany } = vi.hoisted(() => ({
  conversationFindUnique: vi.fn(),
  messageFindMany: vi.fn(),
}));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    conversation: { findUnique: conversationFindUnique },
    message: { findMany: messageFindMany },
  },
}));

import { createApp } from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { signSessionToken } from '../../src/auth/jwt.js';
import { createAuthRateLimiter } from '../../src/middleware/rateLimit.js';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const CAROL = 'user_carol';
const CONVERSATION = 'conversation_1';

const PARTICIPANTS = { userOneId: ALICE, userTwoId: BOB };

const MESSAGE_ROW = {
  id: 'message_2',
  conversationId: CONVERSATION,
  senderId: ALICE,
  content: 'Hello Bo',
  createdAt: new Date('2026-11-20T09:30:00.000Z'),
};

let app;

function cookie(userId = ALICE) {
  return `${SESSION_COOKIE_NAME}=${signSessionToken(userId, { secret: TEST_SECRET })}`;
}

function get(query = '', userId = ALICE) {
  return request(app)
    .get(`/api/conversations/${CONVERSATION}/messages${query}`)
    .set('Cookie', cookie(userId));
}

beforeEach(() => {
  app = createApp({ credentialLimiter: createAuthRateLimiter() });
  conversationFindUnique.mockReset();
  messageFindMany.mockReset();

  conversationFindUnique.mockResolvedValue(PARTICIPANTS);
  messageFindMany.mockResolvedValue([MESSAGE_ROW]);
});

describe('GET /api/conversations/:id/messages', () => {
  it('returns the page in wire shape with a null cursor at the end', async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      messages: [
        {
          id: 'message_2',
          conversationId: CONVERSATION,
          senderId: ALICE,
          body: 'Hello Bo',
          createdAt: '2026-11-20T09:30:00.000Z',
        },
      ],
      nextCursor: null,
    });
  });

  it('queries newest first and asks for one extra row to detect a next page', async () => {
    await get('?limit=2');

    const [{ orderBy, take, where }] = messageFindMany.mock.calls[0];
    expect(orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(take).toBe(3);
    expect(where).toEqual({ conversationId: CONVERSATION });
  });

  it('returns a nextCursor when another page exists', async () => {
    messageFindMany.mockResolvedValue([
      MESSAGE_ROW,
      { ...MESSAGE_ROW, id: 'message_1' },
    ]);

    const response = await get('?limit=1');

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(1);
    expect(typeof response.body.nextCursor).toBe('string');
  });

  it('applies a valid cursor as a keyset filter', async () => {
    messageFindMany.mockResolvedValue([]);

    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: '2026-11-20T09:30:00.000Z',
        id: 'message_2',
      }),
      'utf8'
    ).toString('base64url');

    const response = await get(`?cursor=${cursor}`);

    expect(response.status).toBe(200);
    const [{ where }] = messageFindMany.mock.calls[0];
    expect(where.OR).toEqual([
      { createdAt: { lt: new Date('2026-11-20T09:30:00.000Z') } },
      {
        createdAt: new Date('2026-11-20T09:30:00.000Z'),
        id: { lt: 'message_2' },
      },
    ]);
  });

  it('hides the conversation from a non-participant', async () => {
    const response = await get('', CAROL);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CONVERSATION_NOT_FOUND');
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('returns the same 404 for a missing conversation', async () => {
    conversationFindUnique.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it.each(['0', '101', 'abc', '5.5', '-1'])(
    'rejects limit=%s with 400 INVALID_LIMIT',
    async (limit) => {
      const response = await get(`?limit=${limit}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_LIMIT');
      expect(messageFindMany).not.toHaveBeenCalled();
    }
  );

  it('rejects an undecodable cursor with 400 INVALID_CURSOR', async () => {
    const response = await get('?cursor=not-a-cursor');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_CURSOR');
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const response = await request(app).get(
      `/api/conversations/${CONVERSATION}/messages`
    );

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });
});
