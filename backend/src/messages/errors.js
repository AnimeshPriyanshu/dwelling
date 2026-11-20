/**
 * Errors thrown by the message service.
 *
 * The service knows nothing about HTTP. The route modules (PR-57 onward) map
 * these to the status codes and error codes documented in
 * docs/api/README.md:
 *
 * - MessageValidationError            → 400 VALIDATION_FAILED
 * - InvalidMessageLimitError          → 400 INVALID_LIMIT
 * - InvalidMessageCursorError         → 400 INVALID_CURSOR
 * - MessageConversationNotFoundError  → 404 CONVERSATION_NOT_FOUND
 */

/**
 * A create-message request body is missing, malformed, or out of range.
 *
 * `details` names the offending field and is for logging and tests only; the
 * HTTP envelope never echoes it, matching the auth endpoints' error shape.
 */
export class MessageValidationError extends Error {
  constructor(details) {
    super('Request body is invalid.');
    this.name = 'MessageValidationError';
    this.details = details;
  }
}
export class InvalidMessageLimitError extends Error {
  constructor() {
    super('limit must be an integer between 1 and 100.');
    this.name = 'InvalidMessageLimitError';
  }
}

/**
 * The pagination cursor cannot be decoded.
 *
 * A malformed cursor is an error, never a silent restart from the newest page:
 * restarting would duplicate messages the caller has already read.
 */
export class InvalidMessageCursorError extends Error {
  constructor() {
    super('The pagination cursor is invalid.');
    this.name = 'InvalidMessageCursorError';
  }
}

/**
 * The conversation does not exist, or the caller is not one of its two
 * participants.
 *
 * Both cases share one error on purpose (documented not-found, not forbidden):
 * a non-participant must not be able to confirm that a conversation exists.
 * Contact removal does not affect this check — OQ-4 remains open, so the
 * conversation stays readable by its participants.
 */
export class MessageConversationNotFoundError extends Error {
  constructor() {
    super('No conversation with that id exists.');
    this.name = 'MessageConversationNotFoundError';
  }
}
