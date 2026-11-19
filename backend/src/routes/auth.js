import { Router } from 'express';

import { clearSessionCookie, setSessionCookie } from '../auth/cookies.js';
import { signSessionToken } from '../auth/jwt.js';
import { loginUser, signupUser } from '../auth/service.js';
import { validateLoginInput, validateSignupInput } from '../auth/validation.js';
import { env } from '../config/env.js';

export const authRouter = Router();

authRouter.post('/signup', async (request, response, next) => {
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
});

// PR-11 defines login under /api/auth/login. Signup keeps its existing
// /api/signup path so this addition does not change established behavior.
authRouter.post('/auth/login', async (request, response, next) => {
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
});

// Logout is intentionally unauthenticated: a stale or already-expired client
// must still be able to clear its cookie. It removes the cookie from this
// browser only and does not revoke the token (ADR-0022).
authRouter.post('/auth/logout', (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});
