/**
 * Errors thrown by the contact service.
 *
 * The service knows nothing about HTTP. A future route module (PR-38) maps
 * these to the status codes and error codes documented in
 * docs/api/README.md:
 *
 * - SelfContactError        → 400 SELF_CONTACT
 * - ContactUserNotFoundError → 404 USER_NOT_FOUND
 */
export class SelfContactError extends Error {
  constructor() {
    super('A user cannot add themselves as a contact.');
    this.name = 'SelfContactError';
  }
}

/**
 * The target user id does not resolve to a user.
 *
 * Also used when a user is deleted between the existence check and the write,
 * which surfaces as a foreign-key violation inside the transaction.
 */
export class ContactUserNotFoundError extends Error {
  constructor() {
    super('No user with that id exists.');
    this.name = 'ContactUserNotFoundError';
  }
}
