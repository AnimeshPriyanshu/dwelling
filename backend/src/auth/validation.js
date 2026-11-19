import { ValidationError } from './errors.js';

const SIGNUP_ALLOWED_FIELDS = ['email', 'password', 'displayName'];
const LOGIN_ALLOWED_FIELDS = ['email', 'password'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+[.][^\s@]+$/;
const MAXIMUM_EMAIL_LENGTH = 254;
const MINIMUM_PASSWORD_LENGTH = 8;
// bcrypt ignores input beyond 72 bytes, so longer passwords would be silently
// truncated. Enforce the byte limit before hashing instead.
export const MAXIMUM_PASSWORD_BYTES = 72;
const MAXIMUM_DISPLAY_NAME_LENGTH = 50;

function validateLoginPassword(value, details) {
  if (typeof value !== 'string' || value.trim() === '') {
    details.password = 'is required';
    return undefined;
  }

  if (new TextEncoder().encode(value).length > MAXIMUM_PASSWORD_BYTES) {
    details.password = `must be at most ${MAXIMUM_PASSWORD_BYTES} UTF-8 bytes`;
    return undefined;
  }

  return value;
}

export function validateSignupInput(body) {
  const details = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError({ body: 'must be a JSON object' });
  }

  for (const field of Object.keys(body)) {
    if (!SIGNUP_ALLOWED_FIELDS.includes(field)) {
      details[field] = 'is not an allowed field';
    }
  }

  const email = normalizeEmail(body.email, details);
  const password = validatePassword(body.password, details);
  const displayName = normalizeDisplayName(body.displayName, details);

  if (Object.keys(details).length > 0) {
    throw new ValidationError(details);
  }

  return { email, password, displayName };
}

/**
 * Validates a login body using the same conventions as signup: an object with
 * only known fields, a normalized email, and a non-empty password string.
 *
 * Login does not apply signup's minimum length rule: a credential attempt is
 * checked against the stored hash, and only a genuine mismatch should produce
 * the generic 401. The 72-byte cap is still enforced because bcrypt ignores
 * input beyond it.
 *
 * @param {unknown} body
 * @returns {{ email: string, password: string }}
 */
export function validateLoginInput(body) {
  const details = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError({ body: 'must be a JSON object' });
  }

  for (const field of Object.keys(body)) {
    if (!LOGIN_ALLOWED_FIELDS.includes(field)) {
      details[field] = 'is not an allowed field';
    }
  }

  const email = normalizeEmail(body.email, details);
  const password = validateLoginPassword(body.password, details);

  if (Object.keys(details).length > 0) {
    throw new ValidationError(details);
  }

  return { email, password };
}

function normalizeEmail(value, details) {
  if (typeof value !== 'string' || value.trim() === '') {
    details.email = 'is required';
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.length > MAXIMUM_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    details.email = 'must be a valid email address';
    return undefined;
  }

  return normalized;
}

function validatePassword(value, details) {
  // Whitespace-only input is rejected here too, so it becomes a 400 instead of
  // the shared hashing helper throwing and the request falling through to 500.
  if (typeof value !== 'string' || value.trim() === '') {
    details.password = 'is required';
    return undefined;
  }

  if (
    value.length < MINIMUM_PASSWORD_LENGTH ||
    new TextEncoder().encode(value).length > MAXIMUM_PASSWORD_BYTES
  ) {
    details.password = `must be at least ${MINIMUM_PASSWORD_LENGTH} characters and at most ${MAXIMUM_PASSWORD_BYTES} UTF-8 bytes`;
    return undefined;
  }

  return value;
}

function normalizeDisplayName(value, details) {
  if (typeof value !== 'string' || value.trim() === '') {
    details.displayName = 'is required';
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length > MAXIMUM_DISPLAY_NAME_LENGTH) {
    details.displayName = `must be at most ${MAXIMUM_DISPLAY_NAME_LENGTH} characters`;
    return undefined;
  }

  return normalized;
}
