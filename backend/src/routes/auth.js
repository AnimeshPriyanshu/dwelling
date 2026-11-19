import { Router } from 'express';

import { clearSessionCookie, setSessionCookie } from '../auth/cookies.js';
import { signSessionToken } from '../auth/jwt.js';
import { requireAuth, sendAuthRequired } from '../auth/middleware.js';
import { getUserById, loginUser, signupUser } from '../auth/service.js';
import { validateLoginInput, validateSignupInput } from '../auth/validation.js';
import { env } from '../config/env.js';
import { authLimiter } from '../middleware/rateLimit.js';

/**
 * Builds the auth router.
 *
 * The credential limiter is injectable so an app can be constructed with its
 * own counters (tests) while production keeps the shared singleton.
 *
 * @param {{ credentialLimiter?: import('express').RequestHandler }} [options]
 */
export function createAuthRouter({ credentialLimiter = authLimiter } = {}) {
  const authRouter = Router();

  // Credential endpoints carry the stricter limiter (PR-27): brute force and
  // account-enumeration attempts are the expensive failure mode here. Logout and
  // `/auth/me` stay under the global API limiter only.
  authRouter.post(
    '/signup',
    credentialLimiter,
    async (request, response, next) => {
      try {
        const input = validateSignupInput(request.body);
        const user = await signupUser(input);

        setSessionCookie(
          response,
          signSessionToken(user.id, { secret: env.jwtSecret })
        );

        response.status(201).json({ user });
      } catch (error) {
        next(error);
      }
    }
  );

  // PR-11 defines login under /api/auth/login. Signup keeps its existing
  // /api/signup path so this addition does not change established behavior.
  authRouter.post(
    '/auth/login',
    credentialLimiter,
    async (request, response, next) => {
      try {
        const input = validateLoginInput(request.body);
        const user = await loginUser(input);

        setSessionCookie(
          response,
          signSessionToken(user.id, { secret: env.jwtSecret })
        );

        response.status(200).json({ user });
      } catch (error) {
        next(error);
      }
    }
  );

  // The session-bootstrap endpoint: the only way a client learns who it is.
  // A token for a deleted user is a failed session, not a server error (PR-26).
  authRouter.get('/auth/me', requireAuth, async (request, response, next) => {
    try {
      const user = await getUserById(request.auth.userId);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      response.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  });

  // Logout is intentionally unauthenticated: a stale or already-expired client
  // must still be able to clear its cookie. It removes the cookie from this
  // browser only and does not revoke the token (ADR-0022).
  authRouter.post('/auth/logout', (_request, response) => {
    clearSessionCookie(response);
    response.status(204).end();
  });

  return authRouter;
}
