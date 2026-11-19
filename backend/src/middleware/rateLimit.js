import { rateLimit } from 'express-rate-limit';
import { API_PREFIX } from '@dwelling/shared';

/**
 * Server-side rate limiting (PR-27).
 *
 * Counters live in `express-rate-limit`'s in-memory store. That is deliberate:
 * Redis is optional in this project (`REDIS_URL` is usually unset and
 * `backend/src/cache/` no-ops), so a shared store would add a failure mode
 * without a deployment topology to justify it (OQ-14). The consequence is that
 * counters are **per process and lost on restart** — see
 * `docs/architecture/security-and-caching.md`.
 *
 * `trust proxy` is intentionally *not* enabled. Behind a reverse proxy every
 * request would currently appear to come from the proxy's address and share a
 * single bucket. Choosing a trusted proxy configuration is deferred with the
 * deployment topology (OQ-14); enabling `trust proxy: true` without knowing the
 * topology would let clients spoof their key through `X-Forwarded-For`.
 */

/** Fifteen minutes, matching both limiters. */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Broad ceiling for the whole API surface, per IP. */
export const GLOBAL_RATE_LIMIT = 300;

/** Stricter ceiling for credential endpoints, per IP. */
export const AUTH_RATE_LIMIT = 10;

const RATE_LIMITED_BODY = {
  code: 'RATE_LIMITED',
  message: 'Too many requests. Try again later.',
};

/**
 * Seconds until the client may retry, guaranteed to be at least one.
 *
 * express-rate-limit sets `Retry-After` itself when standard or legacy headers
 * are enabled, but it floors the value at zero when the window is about to
 * reset. The API contract promises an integer of at least one, so the handler
 * overwrites the header from the limiter's own `resetTime`.
 */
function retryAfterSeconds(request, windowMs) {
  const resetTime = request.rateLimit?.resetTime;

  if (resetTime instanceof Date) {
    const seconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    return Math.max(1, seconds);
  }

  return Math.max(1, Math.ceil(windowMs / 1000));
}

/**
 * Builds a limiter with the documented 429 contract.
 *
 * Exported as a factory so tests (and future per-route policies) can create
 * isolated instances: the default exports below are process-wide singletons,
 * so their counters would otherwise be shared between tests.
 *
 * @param {{ windowMs: number, limit: number, skip?: (request: import('express').Request) => boolean }} options
 */
export function createRateLimiter({ windowMs, limit, skip } = {}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new TypeError('windowMs must be a positive number of milliseconds.');
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new TypeError('limit must be a positive number.');
  }

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip,
    // The package default is a plain-text body, which would break the
    // documented `{ code, message }` envelope.
    handler(request, response) {
      response.set('Retry-After', String(retryAfterSeconds(request, windowMs)));
      response.status(429).json(RATE_LIMITED_BODY);
    },
  });
}

/**
 * Liveness checks are exempt: a monitoring loop must not be able to exhaust
 * the API budget, and it must keep working once that budget is exhausted.
 *
 * The limiter is mounted at `API_PREFIX`, so `request.originalUrl` is used
 * rather than the mount-relative `request.path`.
 */
export function isHealthCheck(request) {
  const path = (request.originalUrl ?? request.url ?? '').split('?')[0];
  return path === `${API_PREFIX}/health`;
}

export function createGlobalApiLimiter(options = {}) {
  return createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: GLOBAL_RATE_LIMIT,
    skip: isHealthCheck,
    ...options,
  });
}

export function createAuthRateLimiter(options = {}) {
  return createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: AUTH_RATE_LIMIT,
    ...options,
  });
}

/** Mounted for every `/api` request except the health check. */
export const globalApiLimiter = createGlobalApiLimiter();

/** Mounted on signup and login only. */
export const authLimiter = createAuthRateLimiter();
