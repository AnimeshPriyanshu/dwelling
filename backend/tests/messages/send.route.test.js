import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'messages-send-route-test-secret-32-characters';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'messages-send-route-test-secret-32-characters';
});

const { conversationFindUnique, messageCreate } = vi.hoisted(() => ({
  conversationFindUnique: vi.fn(),
  messageCreate: vi.fn(),
}));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    conversation: { findUnique: conversationFindUnique },
    message: { create: messageCreate },
  },
}));

import app from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { JWT_ALGORITHM, signSessionToken } from '../../src/auth/jwt.js';
import { MAX_MESSAGE_BODY_LENGTH } from '../../src/messages/validation.js';

const AUTH_REQUIRED = {
  code: 'AUTH_REQUIRED',
  message: 'Authentication required.',
};

const CONVERSATION_NOT_FOUND = {
  code: 'CONVERSATION_NOT_FOUND',
  message: 'No conversation with that id exists.',
};

const VALIDATION_FAILED = {
  code: 'VALIDATION_FAILED',
  message: 'Invalid input',
};

const ALICE = 'user_alice';
const BOB = 'user_bob';
const CALLER = ALICE;
const CONVERSATION = 'conversation_1';
const STORED_AT = new Date('2026-11-20T09:30:00.000Z');

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function validToken(userId = CALLER) {
  return signSessionToken(userId, { secret: TEST_SECRET });
}

function expiredToken(userId = CALLER) {
  return jwt.sign({ sub: userId }, TEST_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: -10,
  });
}

function send(
  body,
  { conversationId = CONVERSATION, token, authenticated } = {}
) {
  const call = request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Origin', 'http://localhost:5173');

  if (authenticated !== false) {
    call.set('Cookie', sessionCookie(token ?? validToken()));
  }

  return call.send(body);
}

function storedMessage(content = 'Hello Bo', senderId = CALLER) {
  return {
    id: 'msg_1',
    conversationId: CONVERSATION,
    senderId,
    content,
    createdAt: STORED_AT,
  };
}

beforeEach(() => {
  conversationFindUnique.mockReset();
  messageCreate.mockReset();

  // The caller and Bob are the conversation's two participants.
  conversationFindUnique.mockResolvedValue({
    userOneId: ALICE,
    userTwoId: BOB,
  });
  messageCreate.mockImplementation(async ({ data }) => ({
    id: 'msg_1',
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content,
    createdAt: STORED_AT,
  }));
});

describe('POST /api/conversations/:id/messages', () => {
  it('returns 201 with the exact message shape', async () => {
    const response = await send({ body: 'Hello Bo' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: {
        id: 'msg_1',
        conversationId: CONVERSATION,
        senderId: ALICE,
        body: 'Hello Bo',
        createdAt: STORED_AT.toISOString(),
      },
    });
  });

  it('takes the sender and conversation from the request, not the body', async () => {
    const response = await send({ body: 'Hello Bo' });

    expect(response.status).toBe(201);
    expect(conversationFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CONVERSATION } })
    );
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversationId: CONVERSATION,
          senderId: CALLER,
          content: 'Hello Bo',
        },
      })
    );
  });

  it('uses the sender from the session, never a query value', async () => {
    const response = await request(app)
      .post(`/api/conversations/${CONVERSATION}/messages?userId=${BOB}`)
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', sessionCookie(validToken(BOB)))
      .send({ body: 'Hi Alice' });

    expect(response.status).toBe(201);
    expect(response.body.message.senderId).toBe(BOB);
  });

  it('trims surrounding whitespace but keeps inner text and newlines', async () => {
    const response = await send({ body: '  line one\nline two  ' });

    expect(response.status).toBe(201);
    expect(messageCreate.mock.calls[0][0].data.content).toBe(
      'line one\nline two'
    );
    expect(response.body.message.body).toBe('line one\nline two');
  });

  it('accepts a body at the maximum length', async () => {
    const body = 'a'.repeat(MAX_MESSAGE_BODY_LENGTH);

    const response = await send({ body });

    expect(response.status).toBe(201);
    expect(response.body.message.body).toHaveLength(MAX_MESSAGE_BODY_LENGTH);
  });

  it.each([
    ['missing', {}],
    ['empty', { body: '' }],
    ['whitespace only', { body: '   \n\t ' }],
    ['non-string', { body: 42 }],
    ['null', { body: null }],
    ['oversized', { body: 'a'.repeat(MAX_MESSAGE_BODY_LENGTH + 1) }],
  ])('rejects a %s body with 400 VALIDATION_FAILED', async (_label, body) => {
    const response = await send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(VALIDATION_FAILED);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('rejects a senderId field instead of honouring it', async () => {
    const response = await send({ body: 'Hello', senderId: BOB });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(VALIDATION_FAILED);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown field', async () => {
    const response = await send({ body: 'Hello', conversationId: 'other' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(VALIDATION_FAILED);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-object body', async () => {
    const response = await send(['Hello']);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(VALIDATION_FAILED);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('returns 404 for a conversation the caller does not participate in', async () => {
    conversationFindUnique.mockResolvedValue({
      userOneId: 'user_other',
      userTwoId: BOB,
    });

    const response = await send({ body: 'Hello' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(CONVERSATION_NOT_FOUND);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('returns the same 404 for an unknown conversation', async () => {
    conversationFindUnique.mockResolvedValue(null);

    const response = await send({ body: 'Hello' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(CONVERSATION_NOT_FOUND);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('lets the other participant send too', async () => {
    const response = await send(
      { body: 'Hi Alice' },
      { token: validToken(BOB) }
    );

    expect(response.status).toBe(201);
    expect(response.body.message.senderId).toBe(BOB);
  });

  it('is not idempotent: the same body twice stores two messages', async () => {
    const first = await send({ body: 'Hello Bo' });
    const second = await send({ body: 'Hello Bo' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(messageCreate).toHaveBeenCalledTimes(2);
  });

  it('answers 404 when the conversation is deleted during the insert', async () => {
    const foreignKeyViolation = Object.assign(new Error('fk'), {
      code: 'P2003',
    });
    messageCreate.mockRejectedValue(foreignKeyViolation);

    const response = await send({ body: 'Hello' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(CONVERSATION_NOT_FOUND);
  });

  it('returns 401 when the session cookie is missing', async () => {
    const response = await request(app)
      .post(`/api/conversations/${CONVERSATION}/messages`)
      .set('Origin', 'http://localhost:5173')
      .send({ body: 'Hello' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(conversationFindUnique).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired session', async () => {
    const response = await send({ body: 'Hello' }, { token: expiredToken() });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(AUTH_REQUIRED);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('returns 403 for a foreign Origin before touching the database', async () => {
    const response = await request(app)
      .post(`/api/conversations/${CONVERSATION}/messages`)
      .set('Origin', 'https://evil.example')
      .set('Cookie', sessionCookie(validToken()))
      .send({ body: 'Hello' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'Request origin is not allowed.',
    });
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('returns a sanitized 500 when the database fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    messageCreate.mockRejectedValue(
      new Error('postgresql://user:hunter2@db.internal:5432/dwelling')
    );

    try {
      const response = await send({ body: 'Hello' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 'INTERNAL',
        message: 'Internal server error',
      });
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('hunter2');
      expect(serialized).not.toContain('db.internal');
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('does not leak stored fields such as the content column name', async () => {
    const response = await send({ body: 'Hello Bo' });

    expect(Object.keys(response.body.message).sort()).toEqual([
      'body',
      'conversationId',
      'createdAt',
      'id',
      'senderId',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('content');
  });

  it('ignores a stored row projection that includes extra columns', async () => {
    messageCreate.mockResolvedValue({
      ...storedMessage(),
      email: 'bo@example.com',
    });

    const response = await send({ body: 'Hello Bo' });

    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toContain('email');
  });
});
