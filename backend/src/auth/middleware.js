import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from './cookies.js';
import { verifySessionToken } from './jwt.js';

/** The one response body for every authentication failure. */
export function sendAuthRequired(response) {
  response.status(401).json({
    code: 'AUTH_REQUIRED',
    message: 'Authentication required.',
  });
}

/**
 * Builds the session middleware.
 *
 * It reads the JWT from the `dwelling_session` cookie (populated by
 * `cookie-parser`), verifies it, and attaches the identity as
 * `request.auth.userId`. Missing, malformed, expired, and wrongly-signed
 * sessions all produce the same `401 AUTH_REQUIRED`, so no verification detail
 * reaches the client.
 *
 * The middleware does not load the user. A token for a deleted user is rejected
 * by the handler that loads the row (the API contract requires `401`, not
 * `500`), and every request does not need a database round-trip just to know
 * who is calling.
 *
 * No route-specific authorization lives here — that belongs in the domain
 * modules (see docs/architecture/security-and-caching.md).
 *
 * @param {{ secret?: string, cookieName?: string }} [options]
 * @returns {import('express').RequestHandler}
 */
export function createRequireAuth({
  secret = env.jwtSecret,
  cookieName = SESSION_COOKIE_NAME,
} = {}) {
  return function requireAuth(request, response, next) {
    const token = request.cookies?.[cookieName];
    const result = verifySessionToken(token, { secret });

    if (!result.valid) {
      sendAuthRequired(response);
      return;
    }

    request.auth = { userId: result.userId };
    next();
  };
}

/** Ready-to-use middleware for routes, bound to the configured secret. */
export const requireAuth = createRequireAuth();
