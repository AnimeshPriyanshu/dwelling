import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { listContacts } from '../contacts/service.js';

/**
 * Builds the contacts router.
 *
 * `GET /contacts` returns the caller's directed contact rows, projected to the
 * public peer fields. Caller identity comes only from `request.auth.userId`,
 * which `requireAuth` sets from the verified session cookie.
 */
export function createContactsRouter() {
  const contactsRouter = Router();

  contactsRouter.get(
    '/contacts',
    requireAuth,
    async (request, response, next) => {
      try {
        const contacts = await listContacts(request.auth.userId);

        response.status(200).json({ contacts });
      } catch (error) {
        next(error);
      }
    }
  );

  return contactsRouter;
}
