import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { prisma } from '../../src/db/prisma.js';
import { listMessages } from '../../src/messages/service.js';

// These tests need a dedicated PostgreSQL database. Like the other database
// suites they are skipped unless TEST_DATABASE_URL points at dwelling_test;
// vitest.db.setup.js copies it to DATABASE_URL for Prisma.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeWithDatabase = hasTestDatabase ? describe : describe.skip;

describeWithDatabase('listMessages (real PostgreSQL)', () => {
  const suffix = randomUUID();
  const alice = {
    id: `pr55_int_alice_${suffix}`,
    email: `pr55_int_alice_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Alice',
  };
  const bob = {
    id: `pr55_int_bob_${suffix}`,
    email: `pr55_int_bob_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Bob',
  };
  const carol = {
    id: `pr55_int_carol_${suffix}`,
    email: `pr55_int_carol_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Carol',
  };
  const [userOneId, userTwoId] = [alice.id, bob.id].sort();
  const conversationId = `pr55_int_conversation_${suffix}`;
  const baseTime = new Date('2026-11-14T10:00:00.000Z');

  function at(seconds) {
    return new Date(baseTime.getTime() + seconds * 1000);
  }

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [alice, bob, carol].map(
        ({ id, email, passwordHash, displayName }) => ({
          id,
          email,
          passwordHash,
          displayName,
        })
      ),
    });
    await prisma.conversation.create({
      data: { id: conversationId, userOneId, userTwoId },
    });
    await prisma.message.createMany({
      data: [1, 2, 3, 4, 5].map((index) => ({
        id: `pr55_int_msg_${index}_${suffix}`,
        conversationId,
        senderId: index % 2 === 0 ? alice.id : bob.id,
        content: `message ${index}`,
        createdAt: at(index),
      })),
    });
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { conversationId } });
    await prisma.conversation.deleteMany({ where: { id: conversationId } });
    await prisma.user.deleteMany({
      where: { id: { in: [alice.id, bob.id, carol.id] } },
    });
    await prisma.$disconnect();
  });

  it('pages newest first with keyset cursors and no gaps or duplicates', async () => {
    const seen = [];
    let cursor;

    for (let round = 0; round < 5; round += 1) {
      const page = await listMessages(bob.id, conversationId, {
        cursor,
        limit: 2,
      });

      seen.push(...page.messages.map(({ body }) => body));

      if (page.nextCursor === null) {
        break;
      }

      cursor = page.nextCursor;
    }

    expect(seen).toEqual([
      'message 5',
      'message 4',
      'message 3',
      'message 2',
      'message 1',
    ]);
  });

  it('orders messages that share a timestamp by descending id across pages', async () => {
    const tiedConversationId = `pr55_int_tied_${suffix}`;

    await prisma.conversation.create({
      data: { id: tiedConversationId, userOneId, userTwoId },
    });
    await prisma.message.createMany({
      data: ['a', 'b', 'c'].map((letter) => ({
        id: `pr55_int_tied_${letter}_${suffix}`,
        conversationId: tiedConversationId,
        senderId: alice.id,
        content: `tied ${letter}`,
        createdAt: at(10),
      })),
    });

    try {
      const first = await listMessages(alice.id, tiedConversationId, {
        limit: 2,
      });
      const second = await listMessages(alice.id, tiedConversationId, {
        cursor: first.nextCursor,
        limit: 2,
      });

      const ids = [...first.messages, ...second.messages].map(({ id }) => id);

      expect(ids).toEqual([
        `pr55_int_tied_c_${suffix}`,
        `pr55_int_tied_b_${suffix}`,
        `pr55_int_tied_a_${suffix}`,
      ]);
      expect(second.nextCursor).toBeNull();
    } finally {
      await prisma.message.deleteMany({
        where: { conversationId: tiedConversationId },
      });
      await prisma.conversation.deleteMany({
        where: { id: tiedConversationId },
      });
    }
  });

  it('hides the conversation from non-participants', async () => {
    await expect(listMessages(carol.id, conversationId)).rejects.toMatchObject({
      name: 'MessageConversationNotFoundError',
    });
  });
});
