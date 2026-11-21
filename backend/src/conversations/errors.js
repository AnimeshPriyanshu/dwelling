/**
 * Errors thrown by the conversation service.
 *
 * The service knows nothing about HTTP. The route modules (PR-52 onward) map
 * these to the status codes and error codes documented in
 * docs/api/README.md:
 *
 * - SelfConversationError          → 400 SELF_CONVERSATION
 * - ConversationNotContactsError  → 403 NOT_CONTACTS
 * - ConversationUserNotFoundError → 404 USER_NOT_FOUND
 */
export class SelfConversationError extends Error {
  constructor() {
    super('A user cannot start a conversation with themselves.');
    this.name = 'SelfConversationError';
  }
}

/**
 * The peer exists but is not a mutual contact.
 *
 * A conversation is legal only between two mutual contacts (ADR-0020,
 * ADR-0021). This is distinct from an unknown user id, which is reported as
 * `ConversationUserNotFoundError` (OQ-10, resolved).
 */
export class ConversationNotContactsError extends Error {
  constructor() {
    super('A conversation requires both users to be mutual contacts.');
    this.name = 'ConversationNotContactsError';
  }
}

/**
 * The conversation does not exist, or the caller is not one of its two
 * participants.
 *
 * Both cases share one error on purpose: a non-participant must not be able to
 * confirm that a conversation exists, matching the message endpoints'
 * not-found behavior.
 *
 * - ConversationNotFoundError → 404 CONVERSATION_NOT_FOUND
 */
export class ConversationNotFoundError extends Error {
  constructor() {
    super('No conversation with that id exists.');
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * The target user id does not resolve to a user.
 *
 * Also used when a user is deleted between the contact check and the insert,
 * which surfaces as a foreign-key violation.
 */
export class ConversationUserNotFoundError extends Error {
  constructor() {
    super('No user with that id exists.');
    this.name = 'ConversationUserNotFoundError';
  }
}
