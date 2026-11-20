import { beforeEach, describe, expect, it, vi } from 'vitest';

// The service is exercised for real against an in-memory Prisma stand-in that
// enforces the guarantees it relies on: conversations have exactly two
// participants and messages belong to a conversation. Only the database
// boundary is replaced, so these tests do not need PostgreSQL.
const { prismaMock } = vi.hoisted(() => ({ prismaMock: {} }));

vi.mock('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
  listMessages,
} from '../../src/messages/service.js';
import {
  InvalidMessageCursorError,
  InvalidMessageLimitError,
  MessageConversationNotFoundError,
} from '../../src/messages/errors.js';
import { encodeMessageCursor } from '../../src/messages/cursor.js';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const CAROL = 'user_carol';
const CONVERSATION = 'conversation_1';

const BASE_TIME = new Date('2026-11-14T10:00:00.000Z');

function at(seconds) {
  return new Date(BASE_TIME.getTime() + seconds * 1000);
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

function matchesWhere(row, where) {
  if (
    where.conversationId !== undefined &&
    row.conversationId !== where.conversationId
  ) {
    return false;
  }

  if (where.createdAt !== undefined) {
    if (where.createdAt instanceof Date) {
      if (row.createdAt.getTime() !== where.createdAt.getTime()) {
        return false;
      }
    } else if (where.createdAt.lt instanceof Date) {
      if (!(row.createdAt.getTime() < where.createdAt.lt.getTime())) {
        return false;
      }
    }
  }

  if (where.id !== undefined && where.id.lt !== undefined) {
    if (!(row.id < where.id.lt)) {
      return false;
    }
  }

  if (Array.isArray(where.OR)) {
    return where.OR.some((branch) => matchesWhere(row, branch));
  }

  return true;
}

function compareByOrderBy(left, right, orderBy) {
  for (const rule of orderBy) {
    const [field, direction] = Object.entries(rule)[0];

    if (left[field] < right[field]) {
      return direction === 'desc' ? 1 : -1;
    }

    if (left[field] > right[field]) {
      return direction === 'desc' ? -1 : 1;
    }
  }

  return 0;
}

/**
 * Minimal Prisma stand-in for `conversation.findUnique` and
 * `message.findMany`: filtering on `conversationId` plus the cursor's
 * `(createdAt, id)` predicate, multi-key ordering, and `take`.
 */
function createFakeDatabase() {
  const conversations = new Map();
  const messages = [];
  const stats = { messageQueries: 0, lastQuery: null };

  prismaMock.conversation = {
    findUnique: async ({ where, select }) => {
      const row = conversations.get(where.id);

      return row ? selectFields(row, select) : null;
    },
  };

  prismaMock.message = {
    findMany: async ({ where, orderBy, take, select }) => {
      stats.messageQueries += 1;
      stats.lastQuery = { where, orderBy, take };

      return messages
        .filter((row) => matchesWhere(row, where))
        .sort((left, right) => compareByOrderBy(left, right, orderBy))
        .slice(0, take)
        .map((row) => selectFields(row, select));
    },
  };

  function addConversation(id, first, second) {
    const [userOneId, userTwoId] = [first, second].sort();
    conversations.set(id, { id, userOneId, userTwoId });
  }

  function addMessage({
    id,
    createdAt,
    content = `message ${id}`,
    conversationId = CONVERSATION,
    senderId = BOB,
  }) {
    messages.push({ id, createdAt, content, conversationId, senderId });
  }

  return { conversations, messages, stats, addConversation, addMessage };
}

let db;

beforeEach(() => {
  db = createFakeDatabase();
  db.addConversation(CONVERSATION, ALICE, BOB);
});

describe('listMessages', () => {
  it('returns an empty page for a conversation with no messages', async () => {
    await expect(listMessages(ALICE, CONVERSATION)).resolves.toEqual({
      messages: [],
      nextCursor: null,
    });
  });

  it('returns messages newest first with the wire field name body', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1), content: 'first' });
    db.addMessage({ id: 'msg_2', createdAt: at(2), content: 'second' });

    const { messages, nextCursor } = await listMessages(ALICE, CONVERSATION);

    expect(messages).toEqual([
      {
        id: 'msg_2',
        conversationId: CONVERSATION,
        senderId: BOB,
        body: 'second',
        createdAt: at(2),
      },
      {
        id: 'msg_1',
        conversationId: CONVERSATION,
        senderId: BOB,
        body: 'first',
        createdAt: at(1),
      },
    ]);
    expect(nextCursor).toBeNull();
  });

  it('does not expose the stored column name or other fields', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });

    const { messages } = await listMessages(ALICE, CONVERSATION);

    expect(Object.keys(messages[0]).sort()).toEqual([
      'body',
      'conversationId',
      'createdAt',
      'id',
      'senderId',
    ]);
    expect(JSON.stringify(messages)).not.toContain('content');
  });

  it('defaults to the documented page size and reads one row more', async () => {
    await listMessages(ALICE, CONVERSATION);

    expect(DEFAULT_MESSAGE_PAGE_SIZE).toBe(50);
    expect(db.stats.lastQuery.take).toBe(51);
    expect(db.stats.lastQuery.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('honours an explicit limit and accepts the maximum', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });
    db.addMessage({ id: 'msg_2', createdAt: at(2) });

    const page = await listMessages(ALICE, CONVERSATION, { limit: 1 });
    expect(page.messages.map(({ id }) => id)).toEqual(['msg_2']);
    expect(db.stats.lastQuery.take).toBe(2);

    await listMessages(ALICE, CONVERSATION, { limit: MAX_MESSAGE_PAGE_SIZE });
    expect(db.stats.lastQuery.take).toBe(MAX_MESSAGE_PAGE_SIZE + 1);
  });

  it('marks the last page with a null nextCursor', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });
    db.addMessage({ id: 'msg_2', createdAt: at(2) });

    const page = await listMessages(ALICE, CONVERSATION, { limit: 2 });

    expect(page.messages).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('pages backwards with the cursor without gaps or duplicates', async () => {
    for (let index = 1; index <= 5; index += 1) {
      db.addMessage({ id: `msg_${index}`, createdAt: at(index) });
    }

    const seen = [];
    let cursor;

    for (let round = 0; round < 5; round += 1) {
      const page = await listMessages(ALICE, CONVERSATION, {
        cursor,
        limit: 2,
      });

      seen.push(...page.messages.map(({ id }) => id));

      if (page.nextCursor === null) {
        break;
      }

      cursor = page.nextCursor;
    }

    expect(seen).toEqual(['msg_5', 'msg_4', 'msg_3', 'msg_2', 'msg_1']);
    expect(db.messages).toHaveLength(5);
  });

  it('excludes the cursor position and everything newer than it', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });
    db.addMessage({ id: 'msg_2', createdAt: at(2) });
    db.addMessage({ id: 'msg_3', createdAt: at(3) });

    const first = await listMessages(ALICE, CONVERSATION, { limit: 1 });
    expect(first.messages.map(({ id }) => id)).toEqual(['msg_3']);

    const rest = await listMessages(ALICE, CONVERSATION, {
      cursor: first.nextCursor,
      limit: 10,
    });

    expect(rest.messages.map(({ id }) => id)).toEqual(['msg_2', 'msg_1']);
  });

  it('breaks timestamp ties by descending id', async () => {
    const sameTime = at(4);
    db.addMessage({ id: 'msg_b', createdAt: sameTime });
    db.addMessage({ id: 'msg_a', createdAt: sameTime });
    db.addMessage({ id: 'msg_c', createdAt: sameTime });

    const first = await listMessages(ALICE, CONVERSATION, { limit: 2 });

    expect(first.messages.map(({ id }) => id)).toEqual(['msg_c', 'msg_b']);
    expect(first.nextCursor).not.toBeNull();

    const second = await listMessages(ALICE, CONVERSATION, {
      cursor: first.nextCursor,
      limit: 2,
    });

    expect(second.messages.map(({ id }) => id)).toEqual(['msg_a']);
    expect(second.nextCursor).toBeNull();
  });

  it('does not return another conversation’s messages', async () => {
    db.addConversation('conversation_2', ALICE, CAROL);
    db.addMessage({ id: 'msg_1', createdAt: at(1) });
    db.addMessage({
      id: 'msg_other',
      createdAt: at(2),
      conversationId: 'conversation_2',
    });

    const { messages } = await listMessages(ALICE, CONVERSATION);

    expect(messages.map(({ id }) => id)).toEqual(['msg_1']);
  });

  it('lets either participant read the conversation', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });

    await expect(listMessages(BOB, CONVERSATION)).resolves.toMatchObject({
      messages: [{ id: 'msg_1' }],
    });
  });

  it('hides an unknown conversation', async () => {
    await expect(
      listMessages(ALICE, 'conversation_missing')
    ).rejects.toBeInstanceOf(MessageConversationNotFoundError);

    expect(db.stats.messageQueries).toBe(0);
  });

  it('hides a conversation the caller does not participate in', async () => {
    await expect(listMessages(CAROL, CONVERSATION)).rejects.toBeInstanceOf(
      MessageConversationNotFoundError
    );

    expect(db.stats.messageQueries).toBe(0);
  });

  it.each([
    ['non-integer', 1.5],
    ['zero', 0],
    ['negative', -5],
    ['above the maximum', MAX_MESSAGE_PAGE_SIZE + 1],
    ['numeric string', '10'],
    ['null', null],
  ])('rejects a %s limit without querying messages', async (_label, limit) => {
    await expect(
      listMessages(ALICE, CONVERSATION, { limit })
    ).rejects.toBeInstanceOf(InvalidMessageLimitError);

    expect(db.stats.messageQueries).toBe(0);
  });

  it.each([
    ['undecodable', 'not-a-cursor!'],
    ['empty', ''],
    ['non-string', 42],
  ])(
    'rejects an %s cursor without querying messages',
    async (_label, cursor) => {
      await expect(
        listMessages(ALICE, CONVERSATION, { cursor })
      ).rejects.toBeInstanceOf(InvalidMessageCursorError);

      expect(db.stats.messageQueries).toBe(0);
    }
  );

  it('accepts a cursor for a conversation with no newer messages', async () => {
    db.addMessage({ id: 'msg_1', createdAt: at(1) });

    const cursor = encodeMessageCursor({ id: 'msg_1', createdAt: at(1) });

    await expect(
      listMessages(ALICE, CONVERSATION, { cursor })
    ).resolves.toEqual({ messages: [], nextCursor: null });
  });

  it.each([
    ['empty caller', '', CONVERSATION],
    ['blank caller', '   ', CONVERSATION],
    ['non-string caller', 42, CONVERSATION],
    ['empty conversation', ALICE, ''],
    ['non-string conversation', ALICE, null],
  ])(
    'rejects %s without touching the database',
    async (_label, callerId, id) => {
      await expect(listMessages(callerId, id)).rejects.toBeInstanceOf(
        TypeError
      );
      expect(db.stats.messageQueries).toBe(0);
    }
  );
});
