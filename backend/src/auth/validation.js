import { ValidationError } from './errors.js'

const ALLOWED_FIELDS = ['email', 'password', 'displayName']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+[.][^\s@]+$/
const MAXIMUM_EMAIL_LENGTH = 254
const MINIMUM_PASSWORD_LENGTH = 8
// bcrypt ignores input beyond 72 bytes, so longer passwords would be silently
// truncated. Enforce the byte limit before hashing instead.
export const MAXIMUM_PASSWORD_BYTES = 72
const MAXIMUM_DISPLAY_NAME_LENGTH = 50

export function validateSignupInput(body) {
  const details = {}

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError({ body: 'must be a JSON object' })
  }

  for (const field of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      details[field] = 'is not an allowed field'
    }
  }

  const email = normalizeEmail(body.email, details)
  const password = validatePassword(body.password, details)
  const displayName = normalizeDisplayName(body.displayName, details)

  if (Object.keys(details).length > 0) {
    throw new ValidationError(details)
  }

  return { email, password, displayName }
}

function normalizeEmail(value, details) {
  if (typeof value !== 'string' || value.trim() === '') {
    details.email = 'is required'
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (normalized.length > MAXIMUM_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    details.email = 'must be a valid email address'
    return undefined
  }

  return normalized
}

function validatePassword(value, details) {
  if (typeof value !== 'string' || value === '') {
    details.password = 'is required'
    return undefined
  }

  if (
    value.length < MINIMUM_PASSWORD_LENGTH ||
    new TextEncoder().encode(value).length > MAXIMUM_PASSWORD_BYTES
  ) {
    details.password = `must be at least ${MINIMUM_PASSWORD_LENGTH} characters and at most ${MAXIMUM_PASSWORD_BYTES} UTF-8 bytes`
    return undefined
  }

  return value
}

function normalizeDisplayName(value, details) {
  if (typeof value !== 'string' || value.trim() === '') {
    details.displayName = 'is required'
    return undefined
  }

  const normalized = value.trim()

  if (normalized.length > MAXIMUM_DISPLAY_NAME_LENGTH) {
    details.displayName = `must be at most ${MAXIMUM_DISPLAY_NAME_LENGTH} characters`
    return undefined
  }

  return normalized
}
