import { Router } from 'express';

import { setSessionCookie } from '../auth/cookies.js';
import { signSessionToken } from '../auth/jwt.js';
import { signupUser } from '../auth/service.js';
import { validateSignupInput } from '../auth/validation.js';
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
