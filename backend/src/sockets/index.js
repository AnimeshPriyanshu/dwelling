import { SESSION_COOKIE_NAME } from '../auth/cookies.js';
import { verifySessionToken } from '../auth/jwt.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

/** One room per conversation; only its two participants may join. */
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

let ioInstance = null;

/**
 * Reads a cookie value out of a raw `Cookie` header.
 *
 * Socket.IO's handshake is a plain HTTP upgrade request, so `cookie-parser`
 * has already run for the HTTP request but not for the socket. The JWT is
 * `base64url` plus dots, so it needs no percent-decoding, but a malformed
 * header is treated as no cookie rather than an error.
 *
 * @param {string | undefined} header
 * @param {string} name
 * @returns {string | undefined}
 */
function readCookie(header, name) {
  if (typeof header !== 'string') {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return undefined;
}

/**
 * Emits a stored message to the conversation's room.
 *
 * A no-op when no Socket.IO server is registered (unit tests, or an HTTP-only
 * process), so the send route never depends on realtime being wired up.
 *
 * @param {{ id: string, conversationId: string }} message wire message
 */
export function emitMessageCreated(message) {
  ioInstance
    ?.to(conversationRoom(message.conversationId))
    .emit('message:created', message);
}

/**
 * Registers Socket.IO authentication and conversation rooms.
 *
 * Authentication reuses the same HttpOnly session cookie as the HTTP API
 * (ADR-0022): the handshake is rejected unless the JWT verifies, and
 * `socket.data.userId` then comes only from that token. A client joins a room
 * by naming a conversation it participates in; membership is re-checked
 * server-side on every subscribe, so a room name is never proof of access.
 *
 * Event names used here are documented in docs/api/README.md:
 * - `server:ready`         server → client, after a successful handshake
 * - `conversation:subscribe` client → server, `{ conversationId }`, ack `{ ok }`
 * - `conversation:unsubscribe` client → server, `{ conversationId }`
 * - `message:created`      server → room, the stored message
 *
 * @param {import('socket.io').Server} io
 */
export function registerSocketHandlers(io) {
  ioInstance = io;

  io.use((socket, next) => {
    const token = readCookie(
      socket.handshake.headers.cookie,
      SESSION_COOKIE_NAME
    );
    const result = verifySessionToken(token, { secret: env.jwtSecret });

    if (!result.valid) {
      next(new Error('AUTH_REQUIRED'));
      return;
    }

    socket.data.userId = result.userId;
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('server:ready');

    socket.on('conversation:subscribe', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const conversationId = payload?.conversationId;

      if (typeof conversationId !== 'string' || conversationId.trim() === '') {
        reply({ ok: false, code: 'VALIDATION_FAILED' });
        return;
      }

      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { userOneId: true, userTwoId: true },
        });

        const isParticipant =
          conversation !== null &&
          (conversation.userOneId === socket.data.userId ||
            conversation.userTwoId === socket.data.userId);

        if (!isParticipant) {
          // Same answer for a missing conversation and a non-participant.
          reply({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
          return;
        }

        await socket.join(conversationRoom(conversationId));
        reply({ ok: true });
      } catch {
        // Never surface database detail on the socket.
        reply({ ok: false, code: 'INTERNAL' });
      }
    });

    socket.on('conversation:unsubscribe', (payload) => {
      const conversationId = payload?.conversationId;

      if (typeof conversationId === 'string' && conversationId.trim() !== '') {
        socket.leave(conversationRoom(conversationId));
      }
    });
  });
}
