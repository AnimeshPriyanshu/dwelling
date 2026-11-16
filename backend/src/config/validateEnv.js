import { URL } from 'node:url';

const REQUIRED_ENV_VARS = [
  {
    name: 'JWT_SECRET',
    description: 'Secret key for signing JWTs',
  },
];

/**
 * Validates the TEST_DATABASE_URL environment variable.
 *
 * Returns an object with:
 *   - skip: true if TEST_DATABASE_URL is not set (unit tests may proceed).
 *   - skip: false and error set if the URL is present but invalid.
 *   - skip: false and error undefined if the URL is valid.
 *
 * Never uses DATABASE_URL as a fallback. Fail closed: if the variable is
 * set and ambiguous/malformed, the caller must handle the error.
 *
 * Database URL format: postgresql://host:port/dbname?parameters
 * - Required: scheme, hostname, port, database name dwelling_test
 * - Prohibited: credentials in error messages (mask in errors)
 */
export function validateTestDatabaseUrl(env = process.env) {
  const urlString = env.TEST_DATABASE_URL;

  // Case 1: not set → unit tests proceed without DB.
  if (!urlString) {
    return { skip: true, error: undefined };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    // Malformed URL — return a sanitized error (no credentials exposed).
    return { skip: false, error: new Error('TEST_DATABASE_URL is malformed.') };
  }

  // Require PostgreSQL protocol.
  if (parsedUrl.protocol !== 'postgresql:') {
    return {
      skip: false,
      error: new Error('TEST_DATABASE_URL must use the postgresql protocol. '),
    };
  }

  // Require exact database name dwelling_test (case-sensitive, via pathname).
  // For a URL like postgresql://host:port/dwelling_test?schema=public,
  // the pathname is "/dwelling_test". Remove leading slash.
  const dbName = parsedUrl.pathname
    ? parsedUrl.pathname.replace(/^\//, '')
    : '';
  if (dbName !== 'dwelling_test') {
    return {
      skip: false,
      error: new Error(
        'TEST_DATABASE_URL must point to the dwelling_test database. '
      ),
    };
  }

  // Validate that required URL components are present.
  // We check hostname and port but do NOT expose them in error messages.
  const hasHostname = !!parsedUrl.hostname;
  const hasPort = !!parsedUrl.port;
  if (!hasHostname || !hasPort) {
    return { skip: false, error: new Error('TEST_DATABASE_URL is malformed.') };
  }

  // Valid URL format.
  return { skip: false, error: undefined };
}

export function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter(({ name }) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    const names = missing.map(({ name }) => name).join(', ');

    throw new Error(`Missing required environment variable(s): ${names}`);
  }
}
