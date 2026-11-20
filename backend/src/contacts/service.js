import { prisma } from '../db/prisma.js';
import { ContactUserNotFoundError, SelfContactError } from './errors.js';

/** Public fields of the peer returned to a future API route. */
const PEER_FIELDS = { id: true, displayName: true };

function assertUserId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

/**
 * Adds a mutual contact relationship in one atomic transaction (ADR-0021).
 *
 * Contacts are symmetric and immediate: there is no request/accept state, so a
 * successful add writes both directions (`caller → peer` and `peer → caller`)
 * or neither. The composite primary key `(userId, contactId)` makes duplicate
 * rows impossible, and `skipDuplicates` makes concurrent duplicate adds safe:
 * the second writer inserts nothing instead of failing.
 *
 * `callerId` must come from the verified session cookie (`request.auth.userId`
 * via `requireAuth`). A user id from a request body or query is never proof of
 * identity and must not be passed here.
 *
 * Both rows are inserted with a single `createMany`, so a failure while writing
 * the mirrored row rolls the whole statement back. A foreign-key violation
 * means the caller or the peer was deleted after the session was issued; it is
 * reported as an unknown user rather than an internal error.
 *
 * @param {string} callerId verified session user id
 * @param {string} peerId the other user's `User.id`
 * @returns {Promise<{
 *   peer: { id: string, displayName: string },
 *   created: boolean,
 * }>} `created` is true when this call inserted at least one row
 * @throws {TypeError} for malformed ids
 * @throws {SelfContactError} when the caller targets themselves
 * @throws {ContactUserNotFoundError} when the peer does not exist
 */
export async function addContact(callerId, peerId) {
  assertUserId(callerId, 'callerId');
  assertUserId(peerId, 'peerId');

  if (callerId === peerId) {
    throw new SelfContactError();
  }

  return prisma.$transaction(async (transaction) => {
    // Checked inside the transaction so a deletion cannot slip between the
    // lookup and the writes.
    const peer = await transaction.user.findUnique({
      where: { id: peerId },
      select: PEER_FIELDS,
    });

    if (!peer) {
      throw new ContactUserNotFoundError();
    }

    // Insert the mirrored rows in a stable order independent of who initiated
    // the request. Opposite-direction adds then acquire unique-key locks in the
    // same sequence, so concurrent Alice → Bob and Bob → Alice requests cannot
    // deadlock against each other.
    const rows = [
      { userId: callerId, contactId: peerId },
      { userId: peerId, contactId: callerId },
    ].sort((left, right) =>
      left.userId < right.userId ? -1 : left.userId > right.userId ? 1 : 0
    );

    let result;

    try {
      result = await transaction.contact.createMany({
        data: rows,
        skipDuplicates: true,
      });
    } catch (error) {
      // P2003: foreign-key violation. The peer existed at the lookup, so this
      // is a deletion race on either side of the pair.
      if (error?.code === 'P2003') {
        throw new ContactUserNotFoundError();
      }

      throw error;
    }

    return { peer, created: result.count > 0 };
  });
}

/**
 * Lists the contacts owned by `callerId`.
 *
 * Only the caller's directed `Contact` rows are read, so a user appears once
 * per relationship and mirrored duplicates are never returned. The contact
 * relationship's `createdAt` is used internally for ordering only and is never
 * exposed.
 *
 * @param {string} callerId verified session user id
 * @returns {Promise<Array<{ user: { id: string, displayName: string } }>>}
 * @throws {TypeError} for a malformed caller id
 */
export async function listContacts(callerId) {
  assertUserId(callerId, 'callerId');

  const rows = await prisma.contact.findMany({
    where: { userId: callerId },
    orderBy: [{ createdAt: 'desc' }, { contactId: 'asc' }],
    select: {
      contact: {
        select: { id: true, displayName: true },
      },
    },
  });

  return rows.map((row) => ({
    user: { id: row.contact.id, displayName: row.contact.displayName },
  }));
}

/**
 * Removes a mutual contact relationship.
 *
 * The relationship is removed for both directions: the caller→peer row and
 * the peer→caller row are deleted atomically. Removing a non-existent contact
 * is idempotent and returns silently.
 *
 * `callerId` must come from the verified session cookie (`request.auth.userId`
 * via `requireAuth`). A user id from a request body or query is never proof of
 * identity and must not be passed here.
 *
 * @param {string} callerId verified session user id
 * @param {string} peerId the other user's `User.id`
 * @returns {Promise<{ removed: boolean }>} `removed` is true when at least one
 *   row was deleted; `false` when no contact row existed
 * @throws {TypeError} for malformed ids
 * @throws {SelfContactError} when the caller targets themselves
 */
export async function removeContact(callerId, peerId) {
  assertUserId(callerId, 'callerId');
  assertUserId(peerId, 'peerId');

  if (callerId === peerId) {
    throw new SelfContactError();
  }

  const rows = await prisma.$transaction(async (transaction) => {
    // Delete both directions atomically; if neither row exists, count is 0.
    const result = await transaction.contact.deleteMany({
      where: {
        OR: [
          { userId: callerId, contactId: peerId },
          { userId: peerId, contactId: callerId },
        ],
      },
    });

    return { removed: result.count > 0 };
  });

  return rows;
}