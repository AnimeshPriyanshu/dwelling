import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Minimal mock — only what seed() needs at top
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $transaction: async (fn) => fn(),
    user: { findUnique: vi.fn(), create: vi.fn() },
    dwelling: { findUnique: vi.fn(), create: vi.fn() },
    contact: { findUnique: vi.fn(), create: vi.fn() },
    conversation: { findUnique: vi.fn(), create: vi.fn() },
    message: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    $disconnect: vi.fn(),
  })),
}));

vi.mock('@dwelling/shared', () => ({
  hash: vi.fn().mockResolvedValue('$2a$10$hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}));

let seed;

beforeEach(async () => {
  process.env.DEMO_PASSWORD = 'test-password123';
  const module = await import('../../database/seed.js');
  seed = module.seed;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Seed script production guards', () => {
  it('1. Seed aborts when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    try {
      await seed();
      throw new Error('Should have thrown');
    } catch (e) {
      expect(e.message).toBe(
        'Seed aborted: NODE_ENV=production. Seed script must be invoked explicitly via CLI, never during application startup.'
      );
    } finally {
      if (process.env.NODE_ENV) delete process.env.NODE_ENV;
    }
  });

  it('2. Seed aborts when DEMO_PASSWORD not set', async () => {
    const prev = process.env.DEMO_PASSWORD;
    delete process.env.DEMO_PASSWORD;
    try {
      await seed();
      throw new Error('Should have thrown');
    } catch (e) {
      expect(e.message).toBe(
        'Seed aborted: DEMO_PASSWORD not set. Add it to the local .env.local file (never commit real credentials).'
      );
    } finally {
      if (prev) process.env.DEMO_PASSWORD = prev;
    }
  });
});
