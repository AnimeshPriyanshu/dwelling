import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { prisma } from '../../src/db/prisma.js';
import { addContact } from '../../src/contacts/service.js';

// These tests need a dedicated PostgreSQL database. Like the other database
// suites they are skipped unless TEST_DATABASE_URL points at dwelling_test;
// vitest.db.setup.js copies it to DATABASE_URL for Prisma.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeWithDatabase = hasTestDatabase ? describe : describe.skip;

describeWithDatabase('addContact (real PostgreSQL)', () => {
  const suffix = randomUUID();
  const alice = {
    id: `pr36_int_alice_${suffix}`,
    email: `pr36_int_alice_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Alice',
  };
  const bob = {
    id: `pr36_int_bob_${suffix}`,
    email: `pr36_int_bob_${suffix}@example.test`,
    passwordHash: 'not-used',
    displayName: 'Bob',
  };
  const pairFilter = {
    OR: [
      { userId: alice.id, contactId: bob.id },
      { userId: bob.id, contactId: alice.id },
    ],
  };

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [alice, bob].map(({ id, email, passwordHash, displayName }) => ({
        id,
        email,
        passwordHash,
        displayName,
      })),
    });
  });

  afterAll(async () => {
    // Only this test's rows: contacts cascade from User.
    await prisma.contact.deleteMany({ where: pairFilter });
    await prisma.user.deleteMany({
      where: { id: { in: [alice.id, bob.id] } },
    });
    await prisma.$disconnect();
  });

  it('handles concurrent opposite-direction adds without deadlock', async () => {
    // Repeated rounds exercise the lock ordering; a caller-first insert order
    // would make these two requests able to block on each other.
    for (let round = 0; round < 10; round += 1) {
      const results = await Promise.allSettled([
        addContact(alice.id, bob.id),
        addContact(bob.id, alice.id),
      ]);

      const rejected = results.filter((result) => result.status === 'rejected');
      expect(rejected).toEqual([]);
    }

    const rows = await prisma.contact.findMany({ where: pairFilter });

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: alice.id, contactId: bob.id }),
        expect.objectContaining({ userId: bob.id, contactId: alice.id }),
      ])
    );
  });

  it('resolves opposite-direction concurrent adds with one creation', async () => {
    await prisma.contact.deleteMany({ where: pairFilter });

    const [aliceToBob, bobToAlice] = await Promise.all([
      addContact(alice.id, bob.id),
      addContact(bob.id, alice.id),
    ]);

    const createdFlags = [aliceToBob.created, bobToAlice.created].sort();
    expect(createdFlags).toEqual([false, true]);
    expect(aliceToBob.peer).toEqual({
      id: bob.id,
      displayName: bob.displayName,
    });
    expect(bobToAlice.peer).toEqual({
      id: alice.id,
      displayName: alice.displayName,
    });
  });
});
