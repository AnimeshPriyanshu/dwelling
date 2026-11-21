import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { addContact, listContacts } from '../contacts/service.js';
import { validateAddContactInput } from '../contacts/validation.js';

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

  // Adding a contact is immediate and symmetric (ADR-0021): one call writes
  // both mirrored rows. 201 means the relationship is new, 200 means it already
  // existed, so the call is safe to repeat.
  contactsRouter.post(
    '/contacts',
    requireAuth,
    async (request, response, next) => {
      try {
        const { userId } = validateAddContactInput(request.body);
        const { peer, created } = await addContact(request.auth.userId, userId);

        response.status(created ? 201 : 200).json({
          contact: { user: peer },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return contactsRouter;
}
