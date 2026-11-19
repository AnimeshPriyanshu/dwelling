import { Router } from 'express';

import { setSessionCookie } from '../auth/cookies.js';
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
