/**
 * vitest.db.setup.js
 *
 * Runs before every test suite. Checks TEST_DATABASE_URL and:
 * - If not set: logs a clear message so developers know DB tests are skipped.
 *   Individual test files can still call test.skip() or use skip logic.
 * - If set and valid: sets DATABASE_URL env var from TEST_DATABASE_URL so
 *   Prisma can connect, then proceeds normally.
 * - If set but invalid: the validator returns an error object; this setup
 *   throws so the suite fails fast with a clear message.
 *
 * This file is referenced by vitest.config.js via setupFiles.
 */

import { validateTestDatabaseUrl } from './src/config/validateEnv.js';

const result = validateTestDatabaseUrl();

if (result.skip) {
  // TEST_DATABASE_URL not set — DB tests will be skipped by individual
  // test files that check for it. Log a clear message for the developer.
  console.error(
    '[PR-13] TEST_DATABASE_URL is not set. Database integration tests will be skipped.\n' +
    'To run database tests, set TEST_DATABASE_URL to a valid ' +
    'postgresql:// URL pointing to the dwelling_test database.\n'
  );
} else if (result.error) {
  // validateTestDatabaseUrl returned an error object (URL malformed or
  // missing required database name). Throw so the suite fails fast.
  throw result.error;
} else {
  // Valid URL: set DATABASE_URL env var so Prisma can connect.
  // Pass the validated test URL to Prisma without logging credentials.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
// If result.skip: false, the URL was valid — proceed normally.