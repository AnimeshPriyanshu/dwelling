/**
 * backend/tests/database.test.js
 *
 * PR-13: Dedicated PostgreSQL test database strategy.
 *
 * These tests require TEST_DATABASE_URL to be set to a valid URL pointing
 * to the dwelling_test database. If the URL is not set, the tests are
 * skipped with a clear message (handled by vitest.db.setup.js).
 *
 * Important: These tests are serialized — they must not run in parallel
 * against the same database. See PR-13 decisions:
 *   - Do not run database integration tests in parallel.
 *   - Transactions commit on successful return (no auto-rollback).
 *   - Explicit cleanup (DELETE) is required after each write.
 *
 * To run only these database tests:
 *   TEST_DATABASE_URL="postgresql://host:port/dwelling_test?schema=public" npm test -- --testNamePattern "database"
 *
 * To run all tests (unit + DB) when TEST_DATABASE_URL is set:
 *   TEST_DATABASE_URL="postgresql://host:port/dwelling_test?schema=public" npm test
 *
 * NOTES on Prisma usage:
 * - PrismaClient uses DATABASE_URL env var (set by vitest.db.setup.js).
 * - Tests verify connection with SELECT 1; CRUD operations are limited
 *   to connection verification and explicit cleanup pattern documentation.
 * - Do not assume schema from PR-15/PR-16; only test what is safe without
 *   knowing the final migration state.
 */

import { PrismaClient } from '@prisma/client';
import { validateTestDatabaseUrl } from '../src/config/validateEnv.js';

// Check DATABASE_URL availability once at module level.
// If not set, all tests in this file will be skipped.
const { skip: dbSkipped, error: dbError } = validateTestDatabaseUrl();

// When dbSkipped is true, skip the entire describe block.
// When false, run the describe block normally.
const DbTestDescribe = dbSkipped ? describe.skip : describe;

// When dbError is present, the URL is invalid — fail fast before any tests run.
if (dbError) {
  throw dbError;
}

/** PR-13: Database integration tests (dwelling_test) **/
DbTestDescribe('PR-13: Database integration tests (dwelling_test)', () => {
  // These tests are automatically skipped when TEST_DATABASE_URL is not set.
  // When set, they run against the dedicated dwelling_test database.

  test('DB connection succeeds when TEST_DATABASE_URL is valid', async () => {
    // If we reach here, TEST_DATABASE_URL was set, vitest.db.setup.js set
    // DATABASE_URL, and Prisma can connect.
    const prisma = new PrismaClient();
    try {
      await prisma.$connect();
      // Verify basic connectivity.
      const result = await prisma.$queryRaw`SELECT 1 AS ok`;
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ ok: 1 }));
    } finally {
      await prisma.$disconnect();
    }
  });
});
