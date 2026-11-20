import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { sendMessage } from '../messages/service.js';
import { validateCreateMessageInput } from '../messages/validation.js';

/**
 * Builds the messages router.
 *
 * `POST /conversations/:id/messages` stores one message and answers
 * `201 { message }`. The sender is always `request.auth.userId` from the
 * verified session cookie; a `senderId` in the body is rejected by validation,
 * never honoured. Participation is enforced by the service, which answers the
 * same not-found error for a missing conversation and for a non-participant.
 *
 * Send is deliberately not idempotent (OQ-9): a retried request stores a second
 * message, so the route does not deduplicate by body or by header.
 */
export function createMessagesRouter() {
  const messagesRouter = Router();

  messagesRouter.post(
    '/conversations/:id/messages',
    requireAuth,
    async (request, response, next) => {
      try {
        const { body } = validateCreateMessageInput(request.body);
        const { message } = await sendMessage(
          request.auth.userId,
          request.params.id,
          body
        );

        response.status(201).json({ message });
      } catch (error) {
        next(error);
      }
    }
  );

  return messagesRouter;
}
