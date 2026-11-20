import { prisma } from '../db/prisma.js';
import { decodeMessageCursor, encodeMessageCursor } from './cursor.js';
import {
  InvalidMessageLimitError,
  MessageConversationNotFoundError,
} from './errors.js';

/** Page size when the caller sends no `limit`. */
export const DEFAULT_MESSAGE_PAGE_SIZE = 50;

/** Largest page the API serves; a larger `limit` is rejected, not clamped. */
export const MAX_MESSAGE_PAGE_SIZE = 100;

/**
 * `content` is the Prisma column; the wire field is `body` (docs/api/README.md).
 * The mapping lives here so the API contract never depends on the column name.
 */
const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
};

const CONVERSATION_PARTICIPANTS_SELECT = {
  userOneId: true,
  userTwoId: true,
};

function assertId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

/**
 * Validates the requested page size.
 *
 * Only an absent limit defaults; every other invalid input is rejected rather
 * than clamped, so a client never believes it received a different page size
 * than it asked for. Query-string parsing is the route's job (PR-57) — this
 * function accepts an already-parsed number.
 *
 * @param {unknown} limit
 * @returns {number}
 * @throws {InvalidMessageLimitError} for a non-integer or out-of-range limit
 */
function normalizeLimit(limit) {
  if (limit === undefined) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MESSAGE_PAGE_SIZE) {
    throw new InvalidMessageLimitError();
  }

  return limit;
}

/**
 * Restricts a page to messages strictly older than the cursor position.
 *
 * Prisma has no row-value comparison, so `(createdAt, id) < (cursor.createdAt,
 * cursor.id)` is expressed as the equivalent OR of "older timestamp" and
 * "same timestamp, smaller id". The id comparison matches `ORDER BY ... id
 * DESC` and is what makes messages sharing a timestamp page deterministically.
 */
function olderThanCursor({ createdAt, id }) {
  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
  };
}

/**
 * Requires the caller to be one of the conversation's two participants.
 *
 * A missing conversation and a non-participant produce the identical error, so
 * the endpoint cannot be used to confirm that a conversation exists. One query
 * serves both checks: the conversation row already holds the participant ids.
 *
 * @throws {MessageConversationNotFoundError} when absent or not a participant
 */
async function assertParticipant(callerId, conversationId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: CONVERSATION_PARTICIPANTS_SELECT,
  });

  const isParticipant =
    conversation !== null &&
    (conversation.userOneId === callerId ||
      conversation.userTwoId === callerId);

  if (!isParticipant) {
    throw new MessageConversationNotFoundError();
  }
}

/** Projects a stored row to the documented wire shape. */
function toWireMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.content,
    createdAt: row.createdAt,
  };
}

/**
 * Reads one page of a conversation's message history, newest first.
 *
 * Ordering is `createdAt DESC, id DESC` and paging is keyset, matching the
 * contract in docs/api/README.md: a page is the `limit` messages strictly older
 * than the cursor, so messages arriving while a client pages do not shift the
 * page it is reading. Reading one row more than the page size is how the
 * service knows whether another page exists without a count query.
 *
 * Authorization is enforced here, not in the route: only the two participants
 * may read, and both "no such conversation" and "not a participant" are the
 * same not-found error.
 *
 * `callerId` must come from the verified session cookie (`request.auth.userId`
 * via `requireAuth`). A user id from a request body or query is never proof of
 * identity and must not be passed here.
 *
 * @param {string} callerId verified session user id
 * @param {string} conversationId conversation to read
 * @param {{ cursor?: string, limit?: number }} [options] already-parsed query
 *   values; `limit` defaults to 50 and must be an integer in 1–100
 * @returns {Promise<{
 *   messages: Array<{
 *     id: string,
 *     conversationId: string,
 *     senderId: string,
 *     body: string,
 *     createdAt: Date,
 *   }>,
 *   nextCursor: string | null,
 * }>} `nextCursor` is null on the last page
 * @throws {TypeError} for a malformed caller or conversation id
 * @throws {InvalidMessageLimitError} for an invalid limit
 * @throws {InvalidMessageCursorError} for an undecodable cursor
 * @throws {MessageConversationNotFoundError} when absent or not a participant
 */
export async function listMessages(
  callerId,
  conversationId,
  { cursor, limit } = {}
) {
  assertId(callerId, 'callerId');
  assertId(conversationId, 'conversationId');

  const pageSize = normalizeLimit(limit);
  const position = cursor === undefined ? null : decodeMessageCursor(cursor);

  await assertParticipant(callerId, conversationId);

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(position ? olderThanCursor(position) : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageSize + 1,
    select: MESSAGE_SELECT,
  });

  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const lastMessage = page[page.length - 1];

  return {
    messages: page.map(toWireMessage),
    nextCursor:
      hasMore && lastMessage ? encodeMessageCursor(lastMessage) : null,
  };
}
