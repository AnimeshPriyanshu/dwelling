import {
  InvalidMessageCursorError,
  InvalidMessageLimitError,
  MessageValidationError,
} from './errors.js';

/** The only field a message request may carry; the sender is the session user. */
const CREATE_MESSAGE_ALLOWED_FIELDS = ['body'];

/**
 * Stored limit for one message body.
 *
 * The Prisma column is unbounded text, so the limit has to exist here: without
 * it a single request could store an arbitrarily large message, and the JSON
 * parser's 10 kB ceiling alone does not describe a product rule. 4000
 * characters is a chat-sized message, not a document.
 */
export const MAX_MESSAGE_BODY_LENGTH = 4000;

/**
 * Validates and normalises the message text.
 *
 * Surrounding whitespace is trimmed so a message that looks blank on screen
 * cannot be stored as blank-looking content with invisible padding; inner
 * whitespace and newlines are preserved. A trimmed body that is empty is
 * rejected rather than silently dropped, because a client that sent it has a
 * bug it should see.
 *
 * @param {unknown} value
 * @returns {string} the trimmed body
 * @throws {MessageValidationError} when absent, blank, non-string, or too long
 */
export function normalizeMessageBody(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MessageValidationError({ body: 'is required' });
  }

  const normalized = value.trim();

  if (normalized.length > MAX_MESSAGE_BODY_LENGTH) {
    throw new MessageValidationError({
      body: `must be at most ${MAX_MESSAGE_BODY_LENGTH} characters`,
    });
  }

  return normalized;
}

/**
 * Validates a create-message request body.
 *
 * Unknown fields are rejected, not ignored: `senderId` in particular must fail
 * loudly, because a client that sends it believes it can choose the sender and
 * would otherwise be silently overridden by the session user. The conversation
 * comes from the path, so it is not accepted in the body either.
 *
 * @param {unknown} body
 * @returns {{ body: string }}
 * @throws {MessageValidationError} for a non-object, unknown field, or bad body
 */
/** Mirrors `MAX_MESSAGE_PAGE_SIZE` in the service (1–100). */
const MAXIMUM_PAGE_SIZE = 100;

/**
 * Validates the message-history query string.
 *
 * `limit` arrives as text, so it is parsed only when it is purely digits: a
 * value like `1e2`, `5.5`, or `abc` is rejected rather than coerced, because
 * coercing would silently serve a page size the caller did not request. The
 * cursor stays opaque and is decoded by the service, which produces the
 * documented `INVALID_CURSOR` error for anything malformed.
 *
 * @param {Record<string, unknown>} [query]
 * @returns {{ cursor?: string, limit?: number }}
 * @throws {InvalidMessageLimitError} for a non-integer or out-of-range limit
 * @throws {InvalidMessageCursorError} for a non-string cursor
 */
export function validateMessageListQuery(query = {}) {
  const rawLimit = query.limit;
  const rawCursor = query.cursor;
  let limit;

  if (rawLimit !== undefined) {
    if (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit)) {
      throw new InvalidMessageLimitError();
    }

    limit = Number(rawLimit);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAXIMUM_PAGE_SIZE) {
      throw new InvalidMessageLimitError();
    }
  }

  if (rawCursor !== undefined && typeof rawCursor !== 'string') {
    throw new InvalidMessageCursorError();
  }

  return { cursor: rawCursor, limit };
}

export function validateCreateMessageInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new MessageValidationError({ body: 'must be a JSON object' });
  }

  const details = {};

  for (const field of Object.keys(body)) {
    if (!CREATE_MESSAGE_ALLOWED_FIELDS.includes(field)) {
      details[field] = 'is not an allowed field';
    }
  }

  if (Object.keys(details).length > 0) {
    throw new MessageValidationError(details);
  }

  return { body: normalizeMessageBody(body.body) };
}
