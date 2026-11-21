import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { listMessages, sendMessage } from '../messages/service.js';
import {
  validateCreateMessageInput,
  validateMessageListQuery,
} from '../messages/validation.js';
import { emitMessageCreated } from '../sockets/index.js';

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

        // Realtime fan-out is best effort: the message is already stored, so a
        // missing or broken socket layer must not turn a successful send into
        // an error response. `emitMessageCreated` is a no-op without a server.
        emitMessageCreated(message);

        response.status(201).json({ message });
      } catch (error) {
        next(error);
      }
    }
  );

  // Newest-first keyset page. `cursor` and `limit` are the only query values;
  // participation is enforced by the service, and a non-participant gets the
  // same 404 as an unknown conversation.
  messagesRouter.get(
    '/conversations/:id/messages',
    requireAuth,
    async (request, response, next) => {
      try {
        const { cursor, limit } = validateMessageListQuery(request.query);
        const page = await listMessages(
          request.auth.userId,
          request.params.id,
          { cursor, limit }
        );

        response.status(200).json(page);
      } catch (error) {
        next(error);
      }
    }
  );

  return messagesRouter;
}
