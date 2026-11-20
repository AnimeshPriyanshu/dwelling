import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { addContact, listContacts, removeContact } from '../contacts/service.js';

/**
 * Builds the contacts router.
 *
 * `GET /contacts`    — returns the caller's directed contact rows (PR-37)
 * `POST /contacts`   — adds a mutual contact relationship (PR-38)
 * `DELETE /contacts/:peerId` — removes a mutual contact relationship (PR-39)
 *
 * Caller identity comes only from `request.auth.userId`, which `requireAuth`
 * sets from the verified session cookie.
 */
export function createContactsRouter() {
  const contactsRouter = Router();

  // 2a. GET /contacts — returns the caller's contact rows (PR-37)
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

  // 2b. POST /contacts — add a mutual contact relationship (PR-38)
  contactsRouter.post(
    '/contacts',
    requireAuth,
    async (request, response) => {
      try {
        const { peerId } = request.body;

        if (!peerId || typeof peerId !== 'string' || peerId.trim() === '') {
          return response.status(400).json({
            code: 'VALIDATION_FAILED',
            message: "'peerId' is required and must be a non-empty string.",
          });
        }

        const result = await addContact(request.auth.userId, peerId);

        // addContact returns { peer: { id, displayName }, created: boolean }
        // Map to the documented response shape.
        const statusCode = result.created ? 201 : 200;
        response.status(statusCode).json({
          contact: {
            user: { id: result.peer.id, displayName: result.peer.displayName },
          },
        });
      } catch (error) {
        if (error.name === 'SelfContactError') {
          return response.status(400).json({
            code: 'SELF_CONTACT',
            message: error.message,
          });
        }

        if (error.name === 'ContactUserNotFoundError') {
          return response.status(404).json({
            code: 'USER_NOT_FOUND',
            message: error.message,
          });
        }

        // Unexpected error — sanitized 500; no stack trace or DB details leaked
        response.status(500).json({
          code: 'INTERNAL',
          message: 'Internal server error',
        });
      }
    }
  );

  // 2c. DELETE /contacts/:peerId — remove a mutual contact relationship (PR-39)
  contactsRouter.delete(
    '/contacts/:peerId',
    requireAuth,
    async (request, response) => {
      try {
        const peerId = request.params.peerId;

        if (!peerId || typeof peerId !== 'string' || peerId.trim() === '') {
          return response.status(400).json({
            code: 'VALIDATION_FAILED',
            message: "'peerId' is required and must be a non-empty string.",
          });
        }

        await removeContact(request.auth.userId, peerId);

        // Idempotent: always returns 204 No Content
        response.status(204).end();
      } catch (error) {
        if (error.name === 'SelfContactError') {
          return response.status(400).json({
            code: 'SELF_CONTACT',
            message: error.message,
          });
        }

        if (error.name === 'ContactUserNotFoundError') {
          // This shouldn't normally happen since we're deleting, but if the peer
          // doesn't exist we still return 204 idempotently per the contract.
          // However, following the pattern from POST, we could return 404.
          // Per PR-39 contract: removing a non-contact returns 204.
          return response.status(204).end();
        }

        // Unexpected error — sanitized 500; no stack trace or DB details leaked
        response.status(500).json({
          code: 'INTERNAL',
          message: 'Internal server error',
        });
      }
    }
  );

  return contactsRouter;
}