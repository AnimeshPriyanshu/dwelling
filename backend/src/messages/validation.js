import { MessageValidationError } from './errors.js';

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
