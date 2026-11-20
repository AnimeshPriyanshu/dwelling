import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { prisma } from '../../src/db/prisma.js';
import { getOrCreateConversation } from '../../src/conversations/service.js';

// These tests need a dedicated PostgreSQL database. Like the other database
// suites they are skipped unless TEST_DATABASE_URL points at dwelling_test;
// vitest.db.setup.js copies it to DATABASE_URL for Prisma.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeWithDatabase = hasTestDatabase ? describe : describe.skip;

describeWithDatabase('getOrCreateConversation (real PostgreSQL)', () => {
  const suffix = randomUUID();
  const alice = {
    id: `pr51_int_alice_${suffix}`,
    email: `pr51_int_alice_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Alice',
  };
  const bob = {
    id: `pr51_int_bob_${suffix}`,
    email: `pr51_int_bob_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Bob',
  };
  const carol = {
    id: `pr51_int_carol_${suffix}`,
    email: `pr51_int_carol_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Carol',
  };
  const [userOneId, userTwoId] = [alice.id, bob.id].sort();
  const pairFilter = { userOneId, userTwoId };
  const contactFilter = {
    OR: [
      { userId: alice.id, contactId: bob.id },
      { userId: bob.id, contactId: alice.id },
    ],
  };

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
    await prisma.contact.createMany({
      data: [
        { userId: alice.id, contactId: bob.id },
        { userId: bob.id, contactId: alice.id },
      ],
    });
  });

  afterAll(async () => {
    await prisma.conversation.deleteMany({ where: pairFilter });
    await prisma.contact.deleteMany({ where: contactFilter });
    await prisma.user.deleteMany({
      where: { id: { in: [alice.id, bob.id, carol.id] } },
    });
    await prisma.$disconnect();
  });

  it('creates the canonical pair in the database', async () => {
    await prisma.conversation.deleteMany({ where: pairFilter });

    const { conversation, created } = await getOrCreateConversation(
      bob.id,
      alice.id
    );

    expect(created).toBe(true);
    expect(conversation.participants.map(({ id }) => id).sort()).toEqual(
      [alice.id, bob.id].sort()
    );

    const stored = await prisma.conversation.findUnique({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
    });

    expect(stored.id).toBe(conversation.id);
  });

  it('resolves concurrent opposite-direction requests to one row', async () => {
    await prisma.conversation.deleteMany({ where: pairFilter });

    for (let round = 0; round < 10; round += 1) {
      const results = await Promise.allSettled([
        getOrCreateConversation(alice.id, bob.id),
        getOrCreateConversation(bob.id, alice.id),
      ]);

      const rejected = results.filter((result) => result.status === 'rejected');
      expect(rejected).toEqual([]);

      const fulfilled = results.map((result) => result.value);

      expect(fulfilled.map(({ created }) => created).sort()).toEqual([
        false,
        true,
      ]);
      expect(fulfilled[0].conversation.id).toBe(fulfilled[1].conversation.id);

      const rows = await prisma.conversation.findMany({ where: pairFilter });
      expect(rows).toHaveLength(1);
    }
  });

  it('rejects a non-contact and an unknown user', async () => {
    await expect(
      getOrCreateConversation(alice.id, carol.id)
    ).rejects.toMatchObject({ name: 'ConversationNotContactsError' });

    await expect(
      getOrCreateConversation(alice.id, `pr51_missing_${suffix}`)
    ).rejects.toMatchObject({ name: 'ConversationUserNotFoundError' });

    const rows = await prisma.conversation.findMany({
      where: { OR: [{ userOneId: carol.id }, { userTwoId: carol.id }] },
    });
    expect(rows).toEqual([]);
  });
});
