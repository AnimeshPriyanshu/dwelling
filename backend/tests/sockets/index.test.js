import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_SECRET = 'socket-test-secret-with-at-least-32-chars';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'socket-test-secret-with-at-least-32-chars';
});

const { conversationFindUnique } = vi.hoisted(() => ({
  conversationFindUnique: vi.fn(),
}));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { conversation: { findUnique: conversationFindUnique } },
}));

import {
  emitMessageCreated,
  registerSocketHandlers,
} from '../../src/sockets/index.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';
import { signSessionToken } from '../../src/auth/jwt.js';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const CAROL = 'user_carol';

/** Captures the handlers `registerSocketHandlers` installs on a fake server. */
function createFakeIo() {
  const io = {
    use: vi.fn((middleware) => {
      io.middleware = middleware;
    }),
    on: vi.fn((event, handler) => {
      if (event === 'connection') io.connectionHandler = handler;
    }),
    to: vi.fn(() => ({ emit: vi.fn() })),
  };

  return io;
}

function createSocket(cookieHeader) {
  const handlers = new Map();
  const socket = {
    handshake: { headers: { cookie: cookieHeader } },
    data: {},
    emit: vi.fn(),
    join: vi.fn(async () => {}),
    leave: vi.fn(),
    on: vi.fn((event, handler) => handlers.set(event, handler)),
    handlers,
  };

  return socket;
}

function cookie(userId) {
  return `${SESSION_COOKIE_NAME}=${signSessionToken(userId, { secret: TEST_SECRET })}`;
}

beforeEach(() => {
  conversationFindUnique.mockReset();
});

describe('socket authentication', () => {
  it('rejects a handshake without a session cookie', () => {
    const io = createFakeIo();
    registerSocketHandlers(io);
    const next = vi.fn();

    io.middleware(createSocket(undefined), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('AUTH_REQUIRED');
  });

  it('rejects a malformed token', () => {
    const io = createFakeIo();
    registerSocketHandlers(io);
    const next = vi.fn();

    io.middleware(createSocket(`${SESSION_COOKIE_NAME}=nope`), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('attaches the verified user id for a valid cookie', () => {
    const io = createFakeIo();
    registerSocketHandlers(io);
    const socket = createSocket(`theme=dark; ${cookie(ALICE)}; other=1`);
    const next = vi.fn();

    io.middleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.userId).toBe(ALICE);
  });
});

describe('conversation rooms', () => {
  it('joins a participant to the conversation room', async () => {
    const io = createFakeIo();
    registerSocketHandlers(io);
    conversationFindUnique.mockResolvedValue({
      userOneId: ALICE,
      userTwoId: BOB,
    });

    const socket = createSocket(cookie(ALICE));
    socket.data.userId = ALICE;
    io.connectionHandler(socket);

    expect(socket.emit).toHaveBeenCalledWith('server:ready');

    const acknowledge = vi.fn();
    await socket.handlers.get('conversation:subscribe')(
      { conversationId: 'conversation_1' },
      acknowledge
    );

    expect(conversationFindUnique).toHaveBeenCalledWith({
      where: { id: 'conversation_1' },
      select: { userOneId: true, userTwoId: true },
    });
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation_1');
    expect(acknowledge).toHaveBeenCalledWith({ ok: true });
  });

  it('refuses a non-participant with the not-found answer', async () => {
    const io = createFakeIo();
    registerSocketHandlers(io);
    conversationFindUnique.mockResolvedValue({
      userOneId: ALICE,
      userTwoId: BOB,
    });

    const socket = createSocket(cookie(CAROL));
    socket.data.userId = CAROL;
    io.connectionHandler(socket);

    const acknowledge = vi.fn();
    await socket.handlers.get('conversation:subscribe')(
      { conversationId: 'conversation_1' },
      acknowledge
    );

    expect(socket.join).not.toHaveBeenCalled();
    expect(acknowledge).toHaveBeenCalledWith({
      ok: false,
      code: 'CONVERSATION_NOT_FOUND',
    });
  });

  it('rejects a subscribe without a conversation id', async () => {
    const io = createFakeIo();
    registerSocketHandlers(io);

    const socket = createSocket(cookie(ALICE));
    socket.data.userId = ALICE;
    io.connectionHandler(socket);

    const acknowledge = vi.fn();
    await socket.handlers.get('conversation:subscribe')({}, acknowledge);

    expect(acknowledge).toHaveBeenCalledWith({
      ok: false,
      code: 'VALIDATION_FAILED',
    });
    expect(conversationFindUnique).not.toHaveBeenCalled();
  });

  it('leaves a room on request', () => {
    const io = createFakeIo();
    registerSocketHandlers(io);

    const socket = createSocket(cookie(ALICE));
    socket.data.userId = ALICE;
    io.connectionHandler(socket);

    socket.handlers.get('conversation:unsubscribe')({
      conversationId: 'conversation_1',
    });

    expect(socket.leave).toHaveBeenCalledWith('conversation:conversation_1');
  });
});

describe('emitMessageCreated', () => {
  it('emits the stored message to the conversation room', () => {
    const io = createFakeIo();
    const emit = vi.fn();
    io.to.mockReturnValue({ emit });
    registerSocketHandlers(io);

    const message = {
      id: 'message_1',
      conversationId: 'conversation_1',
      senderId: ALICE,
      body: 'Hello',
      createdAt: new Date('2026-11-20T09:30:00.000Z'),
    };

    emitMessageCreated(message);

    expect(io.to).toHaveBeenCalledWith('conversation:conversation_1');
    expect(emit).toHaveBeenCalledWith('message:created', message);
  });
});
