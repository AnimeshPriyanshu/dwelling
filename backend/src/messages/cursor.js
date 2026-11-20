import { InvalidMessageCursorError } from './errors.js';

/**
 * Keyset pagination token: `base64url(JSON { createdAt, id })`.
 *
 * The token is opaque to clients. It carries exactly the two sort keys the
 * page query compares, so it stays valid while newer messages arrive at the
 * top of the conversation — offset pagination would shift a page that is
 * already being read.
 */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

// Bounds the decode work a caller can trigger. A real token is well under 100
// characters; anything far larger is not a token this server issued.
const MAX_CURSOR_LENGTH = 512;

function assertMessageLike(message) {
  if (
    !message ||
    typeof message.id !== 'string' ||
    message.id === '' ||
    !(message.createdAt instanceof Date) ||
    Number.isNaN(message.createdAt.getTime())
  ) {
    throw new TypeError(
      'encodeMessageCursor expects a message with a non-empty id and a valid createdAt Date.'
    );
  }
}

/**
 * Encodes the cursor position *after* the given message.
 *
 * The timestamp is stored as an ISO-8601 string because JSON has no date type;
 * decoding turns it back into a `Date` for Prisma.
 *
 * @param {{ id: string, createdAt: Date }} message last message of the page
 * @returns {string} opaque base64url token
 * @throws {TypeError} for a malformed message
 */
export function encodeMessageCursor(message) {
  assertMessageLike(message);

  return Buffer.from(
    JSON.stringify({
      createdAt: message.createdAt.toISOString(),
      id: message.id,
    }),
    'utf8'
  ).toString('base64url');
}

/**
 * Decodes a cursor produced by `encodeMessageCursor`.
 *
 * Every failure mode — wrong type, wrong alphabet, non-JSON payload, missing
 * fields, an impossible date, a non-canonical timestamp — is the same
 * `InvalidMessageCursorError`, so callers never branch on internals of the
 * token.
 *
 * @param {unknown} value raw `cursor` query value
 * @returns {{ createdAt: Date, id: string }}
 * @throws {InvalidMessageCursorError} when the value is not a valid cursor
 */
export function decodeMessageCursor(value) {
  if (
    typeof value !== 'string' ||
    value === '' ||
    value.length > MAX_CURSOR_LENGTH ||
    !BASE64URL_PATTERN.test(value)
  ) {
    throw new InvalidMessageCursorError();
  }

  let payload;

  try {
    payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidMessageCursorError();
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.id !== 'string' ||
    payload.id === '' ||
    typeof payload.createdAt !== 'string'
  ) {
    throw new InvalidMessageCursorError();
  }

  const createdAt = new Date(payload.createdAt);

  // Requiring the exact round-trip keeps one instant to one token, so a token
  // cannot be re-encoded into several spellings of the same position.
  if (
    Number.isNaN(createdAt.getTime()) ||
    createdAt.toISOString() !== payload.createdAt
  ) {
    throw new InvalidMessageCursorError();
  }

  return { createdAt, id: payload.id };
}
