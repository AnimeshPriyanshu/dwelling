import jwt from 'jsonwebtoken';

/** Seven days, fixed at issue. No refresh, no sliding session (ADR-0022). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** The only accepted algorithm, both when signing and when verifying. */
export const JWT_ALGORITHM = 'HS256';

function assertSecret(secret) {
  if (typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('JWT_SECRET is not configured.');
  }
}

/**
 * Signs a session token for a user.
 *
 * Claims are exactly `sub`, `iat`, and `exp` (ADR-0022). No email, display
 * name, or role is embedded, so profile changes never require re-issuing a
 * token. The returned token is never logged.
 *
 * @param {string} userId
 * @param {{ secret?: string, expiresInSeconds?: number }} [options]
 * @returns {string} the signed JWT
 */
export function signSessionToken(
  userId,
  { secret, expiresInSeconds = SESSION_TTL_SECONDS } = {}
) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new TypeError('userId must be a non-empty string.');
  }

  assertSecret(secret);

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new RangeError('expiresInSeconds must be a positive number.');
  }

  return jwt.sign({}, secret, {
    algorithm: JWT_ALGORITHM,
    subject: userId,
    expiresIn: expiresInSeconds,
  });
}

/**
 * Verifies a session token.
 *
 * Never throws and never returns a token or its raw payload: callers get a
 * discriminated result. Expired, malformed, wrongly-signed, and missing tokens
 * all collapse to `valid: false`, so the transport layer can answer them
 * identically and leak nothing about why verification failed.
 *
 * @param {unknown} token
 * @param {{ secret?: string }} [options]
 * @returns {{ valid: true, userId: string } | { valid: false }}
 */
export function verifySessionToken(token, { secret } = {}) {
  if (typeof secret !== 'string' || secret.trim() === '') {
    return { valid: false };
  }

  if (typeof token !== 'string' || token === '') {
    return { valid: false };
  }

  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] });
  } catch {
    // TokenExpiredError, JsonWebTokenError, NotBeforeError — all rejected.
    return { valid: false };
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    payload.sub === ''
  ) {
    return { valid: false };
  }

  return { valid: true, userId: payload.sub };
}
