import { beforeEach, describe, expect, it, vi } from 'vitest';

// The service is exercised for real against an in-memory Prisma stand-in that
// enforces the guarantees it relies on: the canonical-pair CHECK, the unique
// pair constraint, contact composite keys, and foreign keys. Only the database
// boundary is replaced, because these are service-level tests and must not
// require PostgreSQL.
const { prismaMock } = vi.hoisted(() => ({ prismaMock: {} }));

vi.mock('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

import {
  canonicalPair,
  getOrCreateConversation,
} from '../../src/conversations/service.js';
import {
  ConversationNotContactsError,
  ConversationUserNotFoundError,
  SelfConversationError,
} from '../../src/conversations/errors.js';

const ALICE = {
  id: 'user_alice',
  displayName: 'Alice',
  email: 'alice@example.test',
  passwordHash: 'hash',
};
const BOB = {
  id: 'user_bob',
  displayName: 'Bob',
  email: 'bob@example.test',
  passwordHash: 'hash',
};
const CAROL = {
  id: 'user_carol',
  displayName: 'Carol',
  email: 'carol@example.test',
  passwordHash: 'hash',
};

const CREATED_AT = new Date('2026-11-20T10:00:00.000Z');
const PARTICIPANT_SELECT = { id: true, displayName: true };

function edgeKey(userId, contactId) {
  return `${userId}::${contactId}`;
}

function selectFields(row, select) {
  if (!select) {
    return { ...row };
  }

  return Object.fromEntries(
    Object.keys(select)
      .filter((field) => select[field])
      .map((field) => [field, row[field]])
  );
}

/**
 * Minimal Prisma stand-in with the guarantees the service depends on:
 * - `Contact` is unique on `(userId, contactId)`.
 * - `Conversation` is unique on the canonical pair and rejects an unordered
 *   pair the way the migration's CHECK constraint does.
 * - Both models require existing users (foreign keys).
 */
function createFakeDatabase() {
  const users = new Map([
    [ALICE.id, ALICE],
    [BOB.id, BOB],
    [CAROL.id, CAROL],
  ]);
  const contacts = new Set();
  const conversations = new Map();
  const stats = {
    contactFindManyCalls: 0,
    conversationCreates: 0,
    failNextCreate: undefined,
  };

  function shapeConversation(row) {
    return {
      id: row.id,
      createdAt: row.createdAt,
      userOne: selectFields(users.get(row.userOneId), PARTICIPANT_SELECT),
      userTwo: selectFields(users.get(row.userTwoId), PARTICIPANT_SELECT),
    };
  }

  prismaMock.user = {
    findUnique: async ({ where, select }) => {
      const user = users.get(where.id);

      return user ? selectFields(user, select) : null;
    },
  };

  prismaMock.contact = {
    findMany: async ({ where }) => {
      stats.contactFindManyCalls += 1;

      const wanted = new Set(
        (where?.OR ?? []).map((edge) => edgeKey(edge.userId, edge.contactId))
      );

      return [...contacts]
        .filter((key) => wanted.has(key))
        .map((key) => {
          const [userId, contactId] = key.split('::');

          return { userId, contactId };
        });
    },
  };

  prismaMock.conversation = {
    findUnique: async ({ where }) => {
      const { userOneId, userTwoId } = where.userOneId_userTwoId;
      const row = conversations.get(edgeKey(userOneId, userTwoId));

      return row ? shapeConversation(row) : null;
    },
    create: async ({ data }) => {
      stats.conversationCreates += 1;

      if (stats.failNextCreate) {
        const error = stats.failNextCreate;
        stats.failNextCreate = undefined;
        throw error;
      }

      if (!(data.userOneId < data.userTwoId)) {
        throw new Error(
          `canonical pair violated: ${data.userOneId} >= ${data.userTwoId}`
        );
      }

      if (!users.has(data.userOneId) || !users.has(data.userTwoId)) {
        throw Object.assign(new Error('Foreign key constraint failed'), {
          code: 'P2003',
        });
      }

      const key = edgeKey(data.userOneId, data.userTwoId);

      if (conversations.has(key)) {
        throw Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        });
      }

      const row = {
        id: `conversation_${conversations.size + 1}`,
        createdAt: CREATED_AT,
        userOneId: data.userOneId,
        userTwoId: data.userTwoId,
      };
      conversations.set(key, row);

      return shapeConversation(row);
    },
  };

  return { users, contacts, conversations, stats };
}

let db;

beforeEach(() => {
  db = createFakeDatabase();
});

function makeMutualContacts(first, second) {
  db.contacts.add(edgeKey(first, second));
  db.contacts.add(edgeKey(second, first));
}

describe('canonicalPair', () => {
  it('orders the pair by plain string comparison', () => {
    expect(canonicalPair(BOB.id, ALICE.id)).toEqual([ALICE.id, BOB.id]);
    expect(canonicalPair(ALICE.id, BOB.id)).toEqual([ALICE.id, BOB.id]);
  });

  it.each([
    ['empty first id', '', BOB.id],
    ['blank second id', ALICE.id, '   '],
    ['non-string first id', 42, BOB.id],
    ['non-string second id', ALICE.id, null],
  ])('rejects %s', (_label, first, second) => {
    expect(() => canonicalPair(first, second)).toThrow(TypeError);
  });
});

describe('getOrCreateConversation', () => {
  it('creates one conversation for mutual contacts and reports created true', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    const result = await getOrCreateConversation(ALICE.id, BOB.id);

    expect(result).toEqual({
      conversation: {
        id: 'conversation_1',
        participants: [
          { id: ALICE.id, displayName: ALICE.displayName },
          { id: BOB.id, displayName: BOB.displayName },
        ],
        createdAt: CREATED_AT,
      },
      created: true,
    });
    expect(db.conversations.size).toBe(1);
  });

  it('stores the canonical pair when the caller sorts second', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    await getOrCreateConversation(BOB.id, ALICE.id);

    expect([...db.conversations.keys()]).toEqual([edgeKey(ALICE.id, BOB.id)]);
  });

  it('returns only the documented conversation fields', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    const { conversation } = await getOrCreateConversation(ALICE.id, BOB.id);

    expect(Object.keys(conversation).sort()).toEqual([
      'createdAt',
      'id',
      'participants',
    ]);
    for (const participant of conversation.participants) {
      expect(Object.keys(participant).sort()).toEqual(['displayName', 'id']);
    }
    const serialized = JSON.stringify(conversation);
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('passwordHash');
  });

  it('is idempotent: a second call reuses the row and reports created false', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    const first = await getOrCreateConversation(ALICE.id, BOB.id);
    const second = await getOrCreateConversation(ALICE.id, BOB.id);

    expect(first.created).toBe(true);
    expect(second).toEqual({
      conversation: first.conversation,
      created: false,
    });
    expect(db.conversations.size).toBe(1);
    expect(db.stats.conversationCreates).toBe(1);
  });

  it('resolves both directions to the same conversation', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    const fromAlice = await getOrCreateConversation(ALICE.id, BOB.id);
    const fromBob = await getOrCreateConversation(BOB.id, ALICE.id);

    expect(fromBob.conversation).toEqual(fromAlice.conversation);
    expect(fromBob.created).toBe(false);
    expect(db.conversations.size).toBe(1);
  });

  it('creates exactly one row for concurrent requests in both directions', async () => {
    makeMutualContacts(ALICE.id, BOB.id);

    const [fromAlice, fromBob] = await Promise.all([
      getOrCreateConversation(ALICE.id, BOB.id),
      getOrCreateConversation(BOB.id, ALICE.id),
    ]);

    expect([fromAlice.created, fromBob.created].sort()).toEqual([false, true]);
    expect(fromAlice.conversation).toEqual(fromBob.conversation);
    expect(db.conversations.size).toBe(1);
  });

  it('rejects a conversation with yourself before touching the database', async () => {
    await expect(
      getOrCreateConversation(ALICE.id, ALICE.id)
    ).rejects.toBeInstanceOf(SelfConversationError);

    expect(db.stats.contactFindManyCalls).toBe(0);
    expect(db.stats.conversationCreates).toBe(0);
  });

  it('reports an unknown peer as user not found', async () => {
    await expect(
      getOrCreateConversation(ALICE.id, 'user_missing')
    ).rejects.toBeInstanceOf(ConversationUserNotFoundError);

    expect(db.stats.conversationCreates).toBe(0);
  });

  it('reports a known non-contact as not contacts, not user not found', async () => {
    await expect(
      getOrCreateConversation(ALICE.id, CAROL.id)
    ).rejects.toBeInstanceOf(ConversationNotContactsError);

    expect(db.stats.conversationCreates).toBe(0);
  });

  it('requires both mirrored contact rows, not just the caller’s', async () => {
    db.contacts.add(edgeKey(ALICE.id, BOB.id));

    await expect(
      getOrCreateConversation(ALICE.id, BOB.id)
    ).rejects.toBeInstanceOf(ConversationNotContactsError);

    expect(db.stats.conversationCreates).toBe(0);
  });

  it('reports a peer deleted after the contact check as user not found', async () => {
    makeMutualContacts(ALICE.id, BOB.id);
    db.stats.failNextCreate = Object.assign(
      new Error('Foreign key constraint failed'),
      { code: 'P2003' }
    );

    await expect(
      getOrCreateConversation(ALICE.id, BOB.id)
    ).rejects.toBeInstanceOf(ConversationUserNotFoundError);

    expect(db.conversations.size).toBe(0);
  });

  it('propagates unexpected database failures', async () => {
    makeMutualContacts(ALICE.id, BOB.id);
    db.stats.failNextCreate = new Error('connection terminated unexpectedly');

    await expect(getOrCreateConversation(ALICE.id, BOB.id)).rejects.toThrow(
      'connection terminated unexpectedly'
    );

    expect(db.conversations.size).toBe(0);
  });

  it.each([
    ['empty caller', '', BOB.id],
    ['blank caller', '   ', BOB.id],
    ['non-string caller', 42, BOB.id],
    ['empty peer', ALICE.id, ''],
    ['blank peer', ALICE.id, '   '],
    ['non-string peer', ALICE.id, null],
  ])(
    'rejects %s without touching the database',
    async (_label, caller, peer) => {
      await expect(
        getOrCreateConversation(caller, peer)
      ).rejects.toBeInstanceOf(TypeError);

      expect(db.stats.contactFindManyCalls).toBe(0);
      expect(db.stats.conversationCreates).toBe(0);
    }
  );
});
