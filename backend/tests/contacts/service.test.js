import { beforeEach, describe, expect, it, vi } from 'vitest';

// The service is exercised for real against an in-memory Prisma stand-in: it
// enforces the composite primary key, foreign keys, skipDuplicates, and
// transaction rollback. Only the database boundary is replaced, because these
// are service-level tests and must not require PostgreSQL.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: null },
}));

vi.mock('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

import { addContact } from '../../src/contacts/service.js';
import {
  ContactUserNotFoundError,
  SelfContactError,
} from '../../src/contacts/errors.js';

const ALICE = { id: 'user_alice', displayName: 'Alice' };
const BOB = { id: 'user_bob', displayName: 'Bob' };

/** One directed contact edge: `owner → contact`. */
function edgeKey(userId, contactId) {
  return `${userId}::${contactId}`;
}

/**
 * Minimal Prisma stand-in with the guarantees the service depends on:
 * - `Contact` is unique on `(userId, contactId)` and indexed both ways.
 * - Contact rows require existing users (foreign key).
 * - `$transaction` rolls back every write when the callback throws.
 */
function createFakeDatabase() {
  const users = new Map([
    [ALICE.id, ALICE],
    [BOB.id, BOB],
  ]);
  const contacts = new Set();
  const stats = {
    transactions: 0,
    createManyCalls: 0,
    failAtRow: undefined,
    beforeCreateMany: undefined,
  };

  const transaction = {
    user: {
      findUnique: async ({ where, select }) => {
        const user = users.get(where.id);
        if (!user) {
          return null;
        }

        if (!select) {
          return user;
        }

        return Object.fromEntries(
          Object.keys(select)
            .filter((field) => select[field])
            .map((field) => [field, user[field]])
        );
      },
    },
    contact: {
      createMany: async ({ data, skipDuplicates = false }) => {
        stats.createManyCalls += 1;

        if (stats.beforeCreateMany) {
          stats.beforeCreateMany();
        }

        let count = 0;

        for (const [index, row] of data.entries()) {
          if (stats.failAtRow === index) {
            throw new Error('simulated contact write failure');
          }

          if (!users.has(row.userId) || !users.has(row.contactId)) {
            throw Object.assign(new Error('Foreign key constraint failed'), {
              code: 'P2003',
            });
          }

          const key = edgeKey(row.userId, row.contactId);
          if (contacts.has(key)) {
            if (skipDuplicates) {
              continue;
            }

            throw Object.assign(new Error('Unique constraint failed'), {
              code: 'P2002',
            });
          }

          contacts.add(key);
          count += 1;
        }

        return { count };
      },
    },
  };

  prismaMock.$transaction = async (callback) => {
    stats.transactions += 1;
    const snapshot = new Set(contacts);

    try {
      return await callback(transaction);
    } catch (error) {
      contacts.clear();
      for (const key of snapshot) {
        contacts.add(key);
      }
      throw error;
    }
  };

  return { users, contacts, stats };
}

let db;

beforeEach(() => {
  db = createFakeDatabase();
});

describe('addContact', () => {
  it('creates both directed rows in one transaction', async () => {
    const result = await addContact(ALICE.id, BOB.id);

    expect(result).toEqual({
      peer: { id: BOB.id, displayName: BOB.displayName },
      created: true,
    });
    expect(db.stats.transactions).toBe(1);
    expect(db.stats.createManyCalls).toBe(1);
    expect(db.contacts).toEqual(
      new Set([edgeKey(ALICE.id, BOB.id), edgeKey(BOB.id, ALICE.id)])
    );
  });

  it('makes each user visible in the other user’s contacts', async () => {
    await addContact(ALICE.id, BOB.id);

    const alicesContacts = [...db.contacts]
      .filter((edge) => edge.startsWith(`${ALICE.id}::`))
      .map((edge) => edge.split('::')[1]);
    const bobsContacts = [...db.contacts]
      .filter((edge) => edge.startsWith(`${BOB.id}::`))
      .map((edge) => edge.split('::')[1]);

    expect(alicesContacts).toEqual([BOB.id]);
    expect(bobsContacts).toEqual([ALICE.id]);
  });

  it('returns only the peer’s public fields', async () => {
    const result = await addContact(ALICE.id, BOB.id);

    expect(Object.keys(result.peer).sort()).toEqual(['displayName', 'id']);
  });

  it('is idempotent: a duplicate add writes nothing and reports created false', async () => {
    const first = await addContact(ALICE.id, BOB.id);
    const second = await addContact(ALICE.id, BOB.id);

    expect(first.created).toBe(true);
    expect(second).toEqual({
      peer: { id: BOB.id, displayName: BOB.displayName },
      created: false,
    });
    expect(db.contacts.size).toBe(2);
  });

  it('repairs a half-written pair instead of creating a duplicate', async () => {
    // A consistent writer never leaves this state, but an interrupted manual
    // cleanup could. The next add restores both directions.
    db.contacts.add(edgeKey(ALICE.id, BOB.id));

    const result = await addContact(ALICE.id, BOB.id);

    expect(result.created).toBe(true);
    expect(db.contacts.size).toBe(2);
    expect(db.contacts.has(edgeKey(BOB.id, ALICE.id))).toBe(true);
  });

  it('rejects adding yourself before touching the database', async () => {
    await expect(addContact(ALICE.id, ALICE.id)).rejects.toBeInstanceOf(
      SelfContactError
    );

    expect(db.stats.transactions).toBe(0);
    expect(db.contacts.size).toBe(0);
  });

  it('reports an unknown peer without writing any row', async () => {
    await expect(addContact(ALICE.id, 'user_missing')).rejects.toBeInstanceOf(
      ContactUserNotFoundError
    );

    expect(db.contacts.size).toBe(0);
  });

  it('reports a peer deleted between the lookup and the write, and rolls back', async () => {
    db.stats.beforeCreateMany = () => db.users.delete(BOB.id);

    await expect(addContact(ALICE.id, BOB.id)).rejects.toBeInstanceOf(
      ContactUserNotFoundError
    );

    expect(db.contacts.size).toBe(0);
  });

  it('rolls back the first directed row when the mirrored row fails', async () => {
    // Row 0 (alice → bob) is inserted, then row 1 fails.
    db.stats.failAtRow = 1;

    await expect(addContact(ALICE.id, BOB.id)).rejects.toThrow(
      'simulated contact write failure'
    );

    expect(db.contacts.size).toBe(0);
  });

  it('propagates unexpected database failures after rolling back', async () => {
    db.stats.failAtRow = 0;

    await expect(addContact(ALICE.id, BOB.id)).rejects.toThrow(
      'simulated contact write failure'
    );

    expect(db.contacts.size).toBe(0);
  });

  it('treats a deleted caller as an unknown user rather than a 500', async () => {
    db.stats.beforeCreateMany = () => db.users.delete(ALICE.id);

    await expect(addContact(ALICE.id, BOB.id)).rejects.toBeInstanceOf(
      ContactUserNotFoundError
    );

    expect(db.contacts.size).toBe(0);
  });

  it('creates exactly one mutual pair for concurrent duplicate adds', async () => {
    const results = await Promise.all([
      addContact(ALICE.id, BOB.id),
      addContact(ALICE.id, BOB.id),
    ]);

    expect(results.map(({ created }) => created).sort()).toEqual([false, true]);
    expect(db.contacts.size).toBe(2);
    expect(db.contacts.has(edgeKey(ALICE.id, BOB.id))).toBe(true);
    expect(db.contacts.has(edgeKey(BOB.id, ALICE.id))).toBe(true);
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
      await expect(addContact(caller, peer)).rejects.toBeInstanceOf(TypeError);

      expect(db.stats.transactions).toBe(0);
    }
  );
});
