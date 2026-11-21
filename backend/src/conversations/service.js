import { prisma } from '../db/prisma.js';
import {
  ConversationNotContactsError,
  ConversationNotFoundError,
  ConversationUserNotFoundError,
  SelfConversationError,
} from './errors.js';

/** Public shape returned to a future API route. */
const CONVERSATION_SELECT = {
  id: true,
  createdAt: true,
  userOne: { select: { id: true, displayName: true } },
  userTwo: { select: { id: true, displayName: true } },
};

const CONTACT_EDGE_SELECT = { userId: true, contactId: true };

function assertUserId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

/**
 * Orders two user ids into the canonical pair stored in `Conversation`
 * (ADR-0020).
 *
 * The comparison is a plain string `<` on cuid text — never `localeCompare` —
 * so the application order matches the database `CHECK ("userOneId" <
 * "userTwoId")` byte order. A pair therefore always resolves to one row no
 * matter who asks.
 *
 * @param {string} firstUserId
 * @param {string} secondUserId
 * @returns {[string, string]} `[userOneId, userTwoId]` with `userOneId < userTwoId`
 * @throws {TypeError} for malformed ids
 */
export function canonicalPair(firstUserId, secondUserId) {
  assertUserId(firstUserId, 'firstUserId');
  assertUserId(secondUserId, 'secondUserId');

  return firstUserId < secondUserId
    ? [firstUserId, secondUserId]
    : [secondUserId, firstUserId];
}

/**
 * Requires a mutual contact relationship between the caller and the peer.
 *
 * Both mirrored contact rows are checked, not just the caller's: the service
 * invariant is that they always exist together, so a half-written pair is not
 * a contact relationship and must not unlock a conversation. When the peer has
 * no user row the error distinguishes an unknown id from a known non-contact,
 * as the API contract specifies (OQ-10, resolved).
 *
 * @throws {ConversationUserNotFoundError} when the peer does not exist
 * @throws {ConversationNotContactsError} when the pair is not mutual contacts
 */
async function assertMutualContacts(callerId, peerId) {
  const edges = await prisma.contact.findMany({
    where: {
      OR: [
        { userId: callerId, contactId: peerId },
        { userId: peerId, contactId: callerId },
      ],
    },
    select: CONTACT_EDGE_SELECT,
  });

  const isMutual =
    edges.some(
      (edge) => edge.userId === callerId && edge.contactId === peerId
    ) &&
    edges.some((edge) => edge.userId === peerId && edge.contactId === callerId);

  if (isMutual) {
    return;
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true },
  });

  if (!peer) {
    throw new ConversationUserNotFoundError();
  }

  throw new ConversationNotContactsError();
}

/** Projects a stored row to the wire shape; positional order carries no meaning. */
function toConversation(row) {
  return {
    id: row.id,
    participants: [
      { id: row.userOne.id, displayName: row.userOne.displayName },
      { id: row.userTwo.id, displayName: row.userTwo.displayName },
    ],
    createdAt: row.createdAt,
  };
}

function findConversation(userOneId, userTwoId) {
  return prisma.conversation.findUnique({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    select: CONVERSATION_SELECT,
  });
}

/**
 * Loads one conversation for a participant.
 *
 * A missing conversation and a non-participant produce the identical error, so
 * the endpoint cannot be used to confirm that a conversation exists.
 *
 * @param {string} callerId verified session user id
 * @param {string} conversationId conversation to load
 * @returns {Promise<{
 *   id: string,
 *   participants: Array<{ id: string, displayName: string }>,
 *   createdAt: Date,
 * }>}
 * @throws {TypeError} for malformed ids
 * @throws {ConversationNotFoundError} when absent or not a participant
 */
export async function getConversationForUser(callerId, conversationId) {
  assertUserId(callerId, 'callerId');
  assertUserId(conversationId, 'conversationId');

  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: CONVERSATION_SELECT,
  });

  const isParticipant =
    row !== null &&
    (row.userOne.id === callerId || row.userTwo.id === callerId);

  if (!isParticipant) {
    throw new ConversationNotFoundError();
  }

  return toConversation(row);
}

/**
 * Returns the single conversation for a pair, creating it on first use.
 *
 * The pair is derived on the server — never supplied by the client — and
 * normalised into the canonical order before any read or write, so callers in
 * either direction resolve to the same row.
 *
 * Creation is race-safe through the database: the row is inserted against
 * `@@unique([userOneId, userTwoId])`, and a concurrent insert surfaces as
 * `P2002`, after which the existing row is re-read. Two simultaneous requests
 * therefore produce one row, one `created: true`, and one `created: false`.
 *
 * `callerId` must come from the verified session cookie (`request.auth.userId`
 * via `requireAuth`). A user id from a request body or query is never proof of
 * identity and must not be passed here.
 *
 * @param {string} callerId verified session user id
 * @param {string} peerId the other user's `User.id`
 * @returns {Promise<{
 *   conversation: {
 *     id: string,
 *     participants: Array<{ id: string, displayName: string }>,
 *     createdAt: Date,
 *   },
 *   created: boolean,
 * }>} `created` is true when this call inserted the row
 * @throws {TypeError} for malformed ids
 * @throws {SelfConversationError} when the caller targets themselves
 * @throws {ConversationUserNotFoundError} when the peer does not exist
 * @throws {ConversationNotContactsError} when the pair are not mutual contacts
 */
export async function getOrCreateConversation(callerId, peerId) {
  assertUserId(callerId, 'callerId');
  assertUserId(peerId, 'peerId');

  if (callerId === peerId) {
    throw new SelfConversationError();
  }

  const [userOneId, userTwoId] = canonicalPair(callerId, peerId);

  await assertMutualContacts(callerId, peerId);

  const existing = await findConversation(userOneId, userTwoId);

  if (existing) {
    return { conversation: toConversation(existing), created: false };
  }

  try {
    const conversation = await prisma.conversation.create({
      data: { userOneId, userTwoId },
      select: CONVERSATION_SELECT,
    });

    return { conversation: toConversation(conversation), created: true };
  } catch (error) {
    // P2002: a concurrent request inserted the same canonical pair first.
    if (error?.code === 'P2002') {
      const raced = await findConversation(userOneId, userTwoId);

      if (raced) {
        return { conversation: toConversation(raced), created: false };
      }
    }

    // P2003: foreign-key violation. The peer existed at the contact check, so
    // this is a deletion race on either side of the pair.
    if (error?.code === 'P2003') {
      throw new ConversationUserNotFoundError();
    }

    throw error;
  }
}
