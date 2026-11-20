import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('../../src/db/prisma.js', () => ({
  prisma: { contact: { findMany } },
}));

import { listContacts } from '../../src/contacts/service.js';

const CALLER_ID = 'user_alice';

beforeEach(() => {
  findMany.mockReset();
});

describe('listContacts', () => {
  it('queries only the caller\u2019s directed contact rows', async () => {
    findMany.mockResolvedValue([]);

    await listContacts(CALLER_ID);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: CALLER_ID } })
    );
  });

  it('applies createdAt DESC then contactId ASC ordering', async () => {
    findMany.mockResolvedValue([]);

    await listContacts(CALLER_ID);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { contactId: 'asc' }],
      })
    );
  });

  it('selects only id and displayName from the related user', async () => {
    findMany.mockResolvedValue([]);

    await listContacts(CALLER_ID);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          contact: { select: { id: true, displayName: true } },
        },
      })
    );
  });

  it('maps rows to the expected public response shape', async () => {
    findMany.mockResolvedValue([
      { contact: { id: 'user_bob', displayName: 'Bob' } },
      { contact: { id: 'user_carol', displayName: 'Carol' } },
    ]);

    const result = await listContacts(CALLER_ID);

    expect(result).toEqual([
      { user: { id: 'user_bob', displayName: 'Bob' } },
      { user: { id: 'user_carol', displayName: 'Carol' } },
    ]);
  });

  it('returns an empty array when there are no contacts', async () => {
    findMany.mockResolvedValue([]);

    const result = await listContacts(CALLER_ID);

    expect(result).toEqual([]);
  });

  it('does not expose timestamps, emails, or other private fields', async () => {
    findMany.mockResolvedValue([
      {
        contact: {
          id: 'user_bob',
          displayName: 'Bob',
          email: 'bob@example.com',
          passwordHash: 'secret',
          createdAt: new Date(),
        },
      },
    ]);

    const result = await listContacts(CALLER_ID);

    expect(result).toEqual([{ user: { id: 'user_bob', displayName: 'Bob' } }]);
    expect(Object.keys(result[0])).toEqual(['user']);
    expect(Object.keys(result[0].user).sort()).toEqual(['displayName', 'id']);
    expect(JSON.stringify(result)).not.toContain('email');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('createdAt');
  });

  it('propagates database errors instead of returning partial data', async () => {
    findMany.mockRejectedValue(new Error('database unavailable'));

    await expect(listContacts(CALLER_ID)).rejects.toThrow(
      'database unavailable'
    );
  });

  it.each([
    ['empty caller', ''],
    ['blank caller', '   '],
    ['non-string caller', 42],
    ['null caller', null],
  ])('rejects %s without touching the database', async (_label, caller) => {
    await expect(listContacts(caller)).rejects.toBeInstanceOf(TypeError);

    expect(findMany).not.toHaveBeenCalled();
  });
});
