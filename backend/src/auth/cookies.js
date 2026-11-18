import { env } from '../config/env.js';
import { SESSION_TTL_SECONDS } from './jwt.js';

/** Fixed by ADR-0022; both the HTTP and socket layers reuse it. */
export const SESSION_COOKIE_NAME = 'dwelling_session';

/**
 * Cookie attributes required by ADR-0022.
 *
 * - `httpOnly` — never readable by JavaScript.
 * - `sameSite: 'lax'` — blocks cross-site POSTs and subrequests. The deployment
 *   topology is still OQ-14, so this is not assumed to be sufficient on its own.
 * - `secure` — production only, so local HTTP development works.
 * - `path: '/'` — sent to every API route.
 * - `maxAge` — Express takes milliseconds; equal to the JWT lifetime.
 *
 * @param {{ isProduction?: boolean }} [options]
 */
export function sessionCookieOptions({ isProduction = env.isProduction } = {}) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction === true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

/**
 * Attaches the session cookie to a response.
 *
 * @param {import('express').Response} response
 * @param {string} token
 * @param {{ isProduction?: boolean }} [options]
 */
export function setSessionCookie(
  response,
  token,
  { isProduction = env.isProduction } = {}
) {
  if (!response || typeof response.cookie !== 'function') {
    throw new TypeError('A response object with cookie() is required.');
  }

  if (typeof token !== 'string' || token === '') {
    throw new TypeError('token must be a non-empty string.');
  }

  response.cookie(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions({ isProduction })
  );
}

/**
 * Clears the session cookie with the same attributes it was set with.
 *
 * `maxAge: 0` produces `Max-Age=0` (plus an expiry in the past), matching
 * ADR-0022. This does not revoke the token; it only removes it from this
 * browser.
 *
 * @param {import('express').Response} response
 * @param {{ isProduction?: boolean }} [options]
 */
export function clearSessionCookie(
  response,
  { isProduction = env.isProduction } = {}
) {
  if (!response || typeof response.cookie !== 'function') {
    throw new TypeError('A response object with cookie() is required.');
  }

  response.cookie(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions({ isProduction }),
    maxAge: 0,
  });
}
