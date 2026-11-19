export const API_PREFIX = '/api'

/**
 * Password hashing and verification utilities.
 * Uses bcryptjs for secure password hashing and comparison.
 */

import { hash as _hash, compare as _compare } from './password.js'

export { _hash as hash, _compare as compare }
