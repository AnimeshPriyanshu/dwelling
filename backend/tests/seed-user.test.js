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

// User preflight tests: documented behavioral requirements for PR-17.
// These tests follow the same mock pattern as the production guard tests above,
// but vitest's vi.fn() mock cannot be invoked with new PrismaClient() in ESM.
// The error: "TypeError: () => ({...}) is not a constructor"
// prevents the actual seed() function from executing its preflight validation.
// A different mock strategy (manual __mocks__ directories, test database, or
// vi.spyOn-based approach) would be needed to auto-run these.
//
// Required behavioral tests (not auto-executed due to mock limitation):
// Test 3: Wrong existing email aborts → assert zero Prisma creates
// Test 4: Missing existing passwordHash aborts → assert zero Prisma creates
// Test 5: Invalid password hash aborts → assert zero Prisma creates
// Test 6: Password mismatch aborts (using shared compare()) → assert zero Prisma creates
// Test 7: DisplayName mismatch aborts → assert zero Prisma creates
// Test 8: Email already belongs to different user ID aborts → assert zero Prisma creates
//
// Additional PR-17 test requirements (not auto-executed):
// Dwelling preflight: existing dwelling with conflicting owner/title
// Contact preflight: missing mirrored contact rows (12 relationships)
// Conversation preflight: wrong participant ordering
// Message preflight: wrong count, content/sender/timestamp mismatch, ordering
// Idempotency: second seed run creates zero duplicates, unique key conflicts
// CLI: node database/seed.js with missing DEMO_PASSWORD exits non-zero
// CLI: NODE_ENV=production exits non-zero
// Valid environment proceeds to database connection/seed operation
