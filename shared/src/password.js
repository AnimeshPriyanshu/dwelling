import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt with a work factor of 10.
 * Rejects empty or whitespace-only passwords.
 * Generates a fresh random salt for every hash.
 * Never logs or persists plaintext passwords.
 *
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} bcrypt hash string
 * @throws {Error} If password is empty or whitespace-only
 */
export async function hash(password) {
  if (password == null || typeof password !== 'string' || password.trim() === '') {
    throw new Error('Password must not be empty or whitespace-only')
  }
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a bcrypt hash.
 * Returns true for a correct password.
 * Returns false for an incorrect password.
 * Returns false for a missing, empty, or non-string password, so callers can
 * treat every unusable credential as a plain mismatch instead of a failure.
 * Returns false for missing or malformed hashes.
 * Does not catch and suppress unexpected internal errors.
 *
 * @param {string} password - The plaintext password to verify
 * @param {string} hash - The bcrypt hash to verify against
 * @returns {Promise<boolean>} true if password matches, false otherwise
 */
export async function compare(password, hash) {
  // Validate password: missing, non-string, empty, or whitespace-only is never
  // a match. Returning false keeps the login contract (401) intact without a
  // thrown error becoming a 500.
  if (password == null || typeof password !== 'string' || password.trim() === '') {
    return false
  }
  // Validate hash: missing, non-string, or malformed → return false
  if (hash == null || typeof hash !== 'string' || hash === '') {
    return false
  }
  return await bcrypt.compare(password, hash)
}