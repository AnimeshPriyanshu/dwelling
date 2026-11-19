import { URL } from 'node:url';

import { env } from '../config/env.js';

/**
 * Origin/Referer enforcement for state-changing API requests (PR-27).
 *
 * This is the server-side half of the CSRF posture: `SameSite=Lax` and the
 * JSON-only Content-Type guard are layers, not the whole answer. A CSRF token
 * is still deferred (OQ-13). See
 * `docs/architecture/security-and-caching.md`.
 *
 * Rules:
 * - Only POST, PUT, PATCH, and DELETE are checked; GET is never blocked.
 * - An `Origin` header, when present, is authoritative. A foreign or malformed
 *   `Origin` is rejected even if the `Referer` looks valid.
 * - With no `Origin`, the origin is derived from `Referer`; a malformed
 *   `Referer` is rejected rather than ignored.
 * - `Origin: null` (sandboxed iframes, `file://`, some cross-origin redirects)
 *   is rejected.
 * - Neither header present: rejected.
 *
 * Rejections never echo the supplied Origin or Referer back to the client.
 */

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ORIGIN_NOT_ALLOWED_BODY = {
  code: 'ORIGIN_NOT_ALLOWED',
  message: 'Request origin is not allowed.',
};

/**
 * Normalizes a URL-like value to its serialized origin, e.g.
 * `http://localhost:5173/anything?x=1` → `http://localhost:5173`.
 *
 * Returns `null` for anything that is not an absolute URL — including the
 * literal string `null` that browsers send for opaque origins.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeOrigin(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * @param {import('express').Request} request
 * @returns {string | null} the request's origin, or `null` when it cannot be
 *   established from either header.
 */
export function requestOrigin(request) {
  const origin = request.get('origin');

  if (typeof origin === 'string') {
    // Present but foreign/malformed is a rejection, not a fallback to Referer.
    return normalizeOrigin(origin);
  }

  const referer = request.get('referer');

  if (typeof referer === 'string') {
    return normalizeOrigin(referer);
  }

  return null;
}

/**
 * Builds the middleware. Exported as a factory so tests can supply an explicit
 * policy without depending on the process environment.
 *
 * @param {{ allowedOrigin?: string }} [options]
 */
export function createOriginCheck({ allowedOrigin = env.clientOrigin } = {}) {
  const allowed = normalizeOrigin(allowedOrigin);

  if (allowed === null) {
    // Fail fast: a malformed CLIENT_ORIGIN would otherwise reject everything.
    throw new Error(
      'CLIENT_ORIGIN must be an absolute origin such as http://localhost:5173.'
    );
  }

  return function originCheck(request, response, next) {
    if (!STATE_CHANGING_METHODS.has(request.method)) {
      next();
      return;
    }

    if (requestOrigin(request) === allowed) {
      next();
      return;
    }

    response.status(403).json(ORIGIN_NOT_ALLOWED_BODY);
  };
}
