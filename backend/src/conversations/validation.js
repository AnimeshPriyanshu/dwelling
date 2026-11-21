import { ValidationError } from '../auth/errors.js';

/** The peer id is the only accepted field; the caller comes from the cookie. */
const CREATE_CONVERSATION_ALLOWED_FIELDS = ['userId'];

/** Matches the length of a cuid plus room for a future id format. */
const MAXIMUM_USER_ID_LENGTH = 64;

/**
 * Validates a create/get conversation request body.
 *
 * The pair itself is never supplied: the client sends the peer's `User.id`
 * and the service derives `(min, max)` from the caller and that id, so both
 * directions resolve to the same canonical row (ADR-0020).
 *
 * @param {unknown} body
 * @returns {{ userId: string }}
 * @throws {ValidationError} for a non-object body, unknown fields, or a bad id
 */
export function validateCreateConversationInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError({ body: 'must be a JSON object' });
  }

  const details = {};

  for (const field of Object.keys(body)) {
    if (!CREATE_CONVERSATION_ALLOWED_FIELDS.includes(field)) {
      details[field] = 'is not an allowed field';
    }
  }

  const { userId } = body;

  if (typeof userId !== 'string' || userId.trim() === '') {
    details.userId = 'is required';
  } else if (userId.trim().length > MAXIMUM_USER_ID_LENGTH) {
    details.userId = `must be at most ${MAXIMUM_USER_ID_LENGTH} characters`;
  }

  if (Object.keys(details).length > 0) {
    throw new ValidationError(details);
  }

  return { userId: userId.trim() };
}
